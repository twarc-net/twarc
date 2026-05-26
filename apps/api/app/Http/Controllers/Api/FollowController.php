<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FollowController extends Controller
{
    /** POST /api/users/{username}/follow */
    public function store(Request $request, string $username): JsonResponse
    {
        $target = User::where('username', $username)->whereNull('deleted_at')->firstOrFail();
        $me = $request->user();

        if ($target->id === $me->id) {
            return response()->json(['message' => "Can't follow yourself."], 422);
        }

        $awardCheck = false;
        DB::transaction(function () use ($me, $target, &$awardCheck) {
            $inserted = DB::table('follows')->insertOrIgnore([
                'follower_id' => $me->id,
                'followee_id' => $target->id,
                'created_at'  => now(),
            ]);
            if ($inserted) {
                // Notify the target
                DB::table('notifications')->insert([
                    'user_id'    => $target->id,
                    'type'       => 'follow',
                    'data'       => json_encode([
                        'follower_id'       => $me->id,
                        'follower_username' => $me->username,
                        'follower_display'  => $me->display_name,
                    ]),
                    'created_at' => now(),
                ]);
                $awardCheck = true;
            }
        });

        // Followee may have crossed a follower-count milestone.
        if ($awardCheck) {
            app(\App\Services\AchievementService::class)->evaluateUser($target);
        }

        return response()->json([
            'following'      => true,
            'follower_count' => $target->followers()->count(),
        ]);
    }

    /** DELETE /api/users/{username}/follow */
    public function destroy(Request $request, string $username): JsonResponse
    {
        $target = User::where('username', $username)->whereNull('deleted_at')->firstOrFail();
        $me = $request->user();

        DB::table('follows')
            ->where('follower_id', $me->id)
            ->where('followee_id', $target->id)
            ->delete();

        return response()->json([
            'following'      => false,
            'follower_count' => $target->followers()->count(),
        ]);
    }

    /** GET /api/users/{username}/followers */
    public function followers(Request $request, string $username): JsonResponse
    {
        $target = User::where('username', $username)->whereNull('deleted_at')->firstOrFail();

        $rows = $target->followers()
            ->orderByPivot('created_at', 'desc')
            ->limit(60)
            ->get(['users.id', 'users.username', 'users.display_name', 'users.avatar_sha256']);

        return response()->json([
            'data' => $rows->map(fn ($u) => [
                'id' => $u->id, 'username' => $u->username,
                'display_name' => $u->display_name,
            ])->all(),
        ]);
    }

    /** GET /api/users/{username}/following */
    public function following(Request $request, string $username): JsonResponse
    {
        $target = User::where('username', $username)->whereNull('deleted_at')->firstOrFail();

        $rows = $target->following()
            ->orderByPivot('created_at', 'desc')
            ->limit(60)
            ->get(['users.id', 'users.username', 'users.display_name', 'users.avatar_sha256']);

        return response()->json([
            'data' => $rows->map(fn ($u) => [
                'id' => $u->id, 'username' => $u->username,
                'display_name' => $u->display_name,
            ])->all(),
        ]);
    }

    /** GET /api/feed — posts from people the authenticated user follows */
    public function feed(Request $request): JsonResponse
    {
        $me = $request->user();
        $followingIds = DB::table('follows')->where('follower_id', $me->id)->pluck('followee_id');

        if ($followingIds->isEmpty()) {
            return response()->json(['data' => [], 'meta' => ['total' => 0]]);
        }

        $q = \App\Models\Post::query()
            ->whereIn('uploader_id', $followingIds)
            ->where('status', 'active')
            ->whereNull('deleted_at');

        if (! $me->show_questionable) {
            $q->where('rating', 'safe');
        }

        $page = $q->orderByDesc('created_at')->paginate(24);

        return response()->json([
            'data' => array_map(fn (\App\Models\Post $p) => [
                'id' => $p->id, 'sha256' => $p->sha256, 'rating' => $p->rating,
                'width' => $p->width, 'height' => $p->height,
                'score' => $p->score, 'fav_count' => $p->fav_count, 'tag_count' => $p->tag_count,
                'thumb_url' => $p->publicUrl('thumb'),
                'sample_url' => $p->publicUrl('sample'),
                'created_at' => $p->created_at?->toIso8601String(),
            ], $page->items()),
            'meta' => ['total' => $page->total(), 'page' => $page->currentPage()],
        ]);
    }
}
