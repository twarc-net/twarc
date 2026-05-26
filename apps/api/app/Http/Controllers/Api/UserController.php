<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function show(\Illuminate\Http\Request $request, string $username): JsonResponse
    {
        $user = User::where('username', $username)->whereNull('deleted_at')->firstOrFail();
        $me = $request->user();
        $iAmFollowing = $me && $me->id !== $user->id
            ? \DB::table('follows')
                ->where('follower_id', $me->id)
                ->where('followee_id', $user->id)
                ->exists()
            : false;

        return response()->json([
            'user' => [
                'id'           => $user->id,
                'username'     => $user->username,
                'display_name' => $user->display_name,
                'bio'          => $user->bio,
                'avatar_sha256' => $user->avatar_sha256,
                'avatar_url'   => $user->avatarUrl('card'),
                'avatar_thumb' => $user->avatarUrl('thumb'),
                'role'         => $user->role,
                'created_at'   => $user->created_at?->toIso8601String(),
                'post_count'   => $user->posts()->where('status', 'active')->count(),
                'follower_count' => $user->followers()->count(),
                'following_count' => $user->following()->count(),
                'badges'       => $user->badges()->get()->map(fn ($b) => [
                    'slug'        => $b->slug,
                    'name'        => $b->name,
                    'icon'        => $b->icon,
                    'color'       => $b->color,
                    'description' => $b->description,
                ])->values(),
                'achievements' => $this->achievementsForProfile($user),
                'is_verified'  => (bool) $user->is_verified,
                'is_following' => $iAmFollowing,
                'is_me'        => $me && $me->id === $user->id,
            ],
        ]);
    }

    public function myPosts(Request $request): JsonResponse
    {
        $user = $request->user();
        $per  = min(60, max(12, (int) $request->query('per_page', 24)));

        $page = Post::query()
            ->where('uploader_id', $user->id)
            ->whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->paginate($per);

        return response()->json([
            'data' => array_map(fn ($p) => [
                'id' => $p->id,
                'sha256' => $p->sha256,
                'rating' => $p->rating,
                'status' => $p->status,
                'score' => $p->score,
                'fav_count' => $p->fav_count,
                'thumb_url' => $p->publicUrl('thumb'),
                'sample_url' => $p->publicUrl('sample'),
                'created_at' => $p->created_at?->toIso8601String(),
            ], $page->items()),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function myStats(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'posts_total'    => $user->posts()->whereNull('deleted_at')->count(),
            'posts_active'   => $user->posts()->where('status', 'active')->whereNull('deleted_at')->count(),
            'favs_received'  => Post::where('uploader_id', $user->id)->sum('fav_count'),
            'score_total'    => Post::where('uploader_id', $user->id)->sum('score'),
            'followers'      => $user->followers()->count(),
            'following'      => $user->following()->count(),
        ]);
    }

    /**
     * Build a full achievement panel (earned + locked, with progress) for a
     * profile view. This is what Steam / GitHub / Stack Overflow do — and it's
     * the single biggest driver of repeat engagement, because users see WHAT
     * comes next and how close they are.
     *
     * Auto-rule badges only — manually-awarded ones (Verified Artist, etc.)
     * appear in the `badges` field above. Locked rows have `progress` 0..1.
     */
    private function achievementsForProfile(User $user): array
    {
        $badges = \DB::table('badges')
            ->where('is_auto', true)
            ->whereNotNull('criteria_rule')
            ->orderBy('sort_order')
            ->get();
        $earnedIds = \DB::table('user_badges')->where('user_id', $user->id)->pluck('awarded_at', 'badge_id');

        // Stat lookups (one query each, cached for the rest of this call).
        static $cache = [];
        $key = "user_{$user->id}";
        if (! isset($cache[$key])) {
            $cache[$key] = [
                'approved_posts' => Post::where('uploader_id', $user->id)
                    ->where('status', 'active')->whereNull('deleted_at')->count(),
                'total_favs'     => (int) Post::where('uploader_id', $user->id)
                    ->where('status', 'active')->whereNull('deleted_at')->sum('fav_count'),
                'series_span'    => (int) (\DB::select(<<<'SQL'
                    SELECT COUNT(DISTINCT t.id) AS n
                    FROM posts p JOIN tags t ON t.id = ANY(p.tag_ids)
                    WHERE p.uploader_id = ? AND p.status='active' AND p.deleted_at IS NULL
                      AND t.category='copyright'
                SQL, [$user->id])[0]->n ?? 0),
                'follower_count' => \DB::table('follows')->where('followee_id', $user->id)->count(),
                'blog_posts'     => \DB::table('blog_posts')
                    ->where('author_id', $user->id)
                    ->where('status', 'published')->count(),
                'veteran_days'   => (int) $user->created_at?->diffInDays(now()),
            ];
        }
        $stats = $cache[$key];

        return $badges->map(function ($b) use ($earnedIds, $stats) {
            $earned   = isset($earnedIds[$b->id]);
            $progress = null;
            if (! $earned && isset($stats[$b->criteria_rule]) && $b->criteria_value > 0) {
                $progress = min(1.0, $stats[$b->criteria_rule] / $b->criteria_value);
            }
            return [
                'slug'        => $b->slug,
                'name'        => $b->name,
                'icon'        => $b->icon,
                'color'       => $b->color,
                'description' => $b->description,
                'earned'      => $earned,
                'awarded_at'  => $earned ? $earnedIds[$b->id] : null,
                'progress'    => $earned ? 1 : ($progress ?? 0),
                'current'     => $stats[$b->criteria_rule] ?? null,
                'goal'        => $b->criteria_value,
            ];
        })->values()->all();
    }
}
