<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ModAction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserAdminController extends Controller
{
    /** GET /api/admin/users?q=&role=&page= */
    public function index(Request $request): JsonResponse
    {
        $per = min(100, max(20, (int) $request->query('per_page', 50)));

        $q = User::query()->whereNull('deleted_at');

        if ($search = $request->query('q')) {
            $q->where(function ($w) use ($search) {
                $w->where('username', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%")
                  ->orWhere('display_name', 'ILIKE', "%{$search}%");
            });
        }
        if ($role = $request->query('role')) {
            $q->where('role', $role);
        }

        $page = $q->orderByDesc('created_at')->paginate($per);

        // Annotate with post counts
        $ids = array_map(fn ($u) => $u->id, $page->items());
        $postCounts = DB::table('posts')
            ->whereIn('uploader_id', $ids)
            ->whereNull('deleted_at')
            ->select('uploader_id', DB::raw('COUNT(*) as c'))
            ->groupBy('uploader_id')
            ->pluck('c', 'uploader_id');

        return response()->json([
            'data' => array_map(fn (User $u) => [
                'id'           => $u->id,
                'username'     => $u->username,
                'email'        => $u->email,
                'display_name' => $u->display_name,
                'role'         => $u->role,
                'post_count'   => (int) ($postCounts[$u->id] ?? 0),
                'created_at'   => $u->created_at?->toIso8601String(),
                'email_verified' => $u->email_verified_at !== null,
            ], $page->items()),
            'meta' => [
                'page' => $page->currentPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    /** PATCH /api/admin/users/{user}  body: {role?} */
    public function update(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'role' => ['required', 'in:member,contributor,moderator,admin'],
        ]);

        // Block self-demotion of last admin
        if ($user->role === 'admin' && $request->input('role') !== 'admin') {
            $adminCount = User::where('role', 'admin')->whereNull('deleted_at')->count();
            if ($adminCount <= 1) {
                return response()->json(['message' => 'Cannot demote the last admin.'], 422);
            }
        }

        DB::transaction(function () use ($request, $user) {
            $oldRole = $user->role;
            // role is intentionally NOT in Fillable — use forceFill to bypass guard
            $user->forceFill(['role' => $request->input('role')])->save();
            ModAction::create([
                'mod_id'      => $request->user()->id,
                'target_type' => 'user',
                'target_id'   => $user->id,
                'action'      => 'role_change',
                'reason'      => "$oldRole → {$request->input('role')}",
            ]);
        });

        return response()->json(['user_id' => $user->id, 'role' => $user->role]);
    }

    /** DELETE /api/admin/users/{user} — soft delete (ban) */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot ban yourself.'], 422);
        }
        if ($user->role === 'admin') {
            return response()->json(['message' => 'Cannot ban an admin. Demote first.'], 422);
        }

        DB::transaction(function () use ($request, $user) {
            $user->delete();
            ModAction::create([
                'mod_id'      => $request->user()->id,
                'target_type' => 'user',
                'target_id'   => $user->id,
                'action'      => 'ban',
                'reason'      => $request->input('reason'),
            ]);
        });

        return response()->json(['user_id' => $user->id, 'banned' => true]);
    }
}
