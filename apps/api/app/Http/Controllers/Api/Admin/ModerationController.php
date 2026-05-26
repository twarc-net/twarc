<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ModAction;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ModerationController extends Controller
{
    /** GET /api/admin/pending — posts awaiting review */
    public function pending(Request $request): JsonResponse
    {
        $per = min(60, max(12, (int) $request->query('per_page', 24)));

        $page = Post::query()
            ->where('status', 'pending')
            ->whereNull('deleted_at')
            ->with('uploader:id,username,display_name')
            ->orderBy('created_at', 'asc')
            ->paginate($per);

        return response()->json([
            'data' => array_map(fn (Post $p) => [
                'id'           => $p->id,
                'sha256'       => $p->sha256,
                'rating'       => $p->rating,
                'width'        => $p->width,
                'height'       => $p->height,
                'thumb_url'    => $p->publicUrl('thumb'),
                'sample_url'   => $p->publicUrl('sample'),
                'preview_url'  => $p->publicUrl('preview'),
                'tag_string'   => $p->tag_string,
                'tag_count'    => $p->tag_count,
                'title'        => $p->title,
                'description'  => $p->description,
                'source_url'   => $p->source_url,
                'uploader'     => $p->uploader ? [
                    'id'           => $p->uploader->id,
                    'username'     => $p->uploader->username,
                    'display_name' => $p->uploader->display_name,
                ] : null,
                'created_at'   => $p->created_at?->toIso8601String(),
            ], $page->items()),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    /** POST /api/admin/posts/{post}/approve */
    public function approve(Request $request, Post $post): JsonResponse
    {
        $uploaderId = null;
        DB::transaction(function () use ($request, $post, &$uploaderId) {
            $post->update(['status' => 'active']);
            $uploaderId = $post->uploader_id;
            ModAction::create([
                'mod_id'      => $request->user()->id,
                'target_type' => 'post',
                'target_id'   => $post->id,
                'action'      => 'approve',
                'reason'      => $request->input('reason'),
            ]);
            // Notify the uploader so they get a real-time "approved" toast.
            if ($uploaderId) {
                DB::table('notifications')->insert([
                    'user_id'    => $uploaderId,
                    'type'       => 'post_approved',
                    'data'       => json_encode([
                        'post_id'   => $post->id,
                        'thumb_url' => $post->publicUrl('thumb'),
                    ]),
                    'created_at' => now(),
                ]);
            }
        });

        // Inline achievement evaluation — surfaces "First Brushstroke", milestones, etc.
        if ($uploaderId) {
            $uploader = \App\Models\User::find($uploaderId);
            if ($uploader) app(\App\Services\AchievementService::class)->evaluateUser($uploader);
        }
        return response()->json(['post_id' => $post->id, 'status' => 'active']);
    }

    /** POST /api/admin/posts/{post}/reject  body: {reason} */
    public function reject(Request $request, Post $post): JsonResponse
    {
        $request->validate(['reason' => ['required', 'string', 'min:3', 'max:500']]);

        DB::transaction(function () use ($request, $post) {
            $post->update(['status' => 'flagged']);
            ModAction::create([
                'mod_id'      => $request->user()->id,
                'target_type' => 'post',
                'target_id'   => $post->id,
                'action'      => 'reject',
                'reason'      => $request->input('reason'),
            ]);
        });
        return response()->json(['post_id' => $post->id, 'status' => 'flagged']);
    }

    /** GET /api/admin/stats — counts for dashboard cards */
    public function stats(): JsonResponse
    {
        return response()->json([
            'pending_posts'  => Post::where('status', 'pending')->whereNull('deleted_at')->count(),
            'flagged_posts'  => Post::where('status', 'flagged')->whereNull('deleted_at')->count(),
            'active_posts'   => Post::where('status', 'active')->whereNull('deleted_at')->count(),
            'total_users'    => DB::table('users')->whereNull('deleted_at')->count(),
            'open_reports'   => DB::table('reports')->where('status', 'open')->count(),
        ]);
    }
}
