<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Auto-award achievements (badges with criteria_rule set).
 *
 * Run for all users by the scheduler nightly (see App\Console\Kernel) — and
 * called inline after high-impact events so users see them appear in close
 * to real time (post approved, follower gained, blog published, etc.).
 *
 * Adding a new achievement = (1) insert a row into the `badges` table with
 * `is_auto = true, criteria_rule = 'X', criteria_value = N` and (2) add
 * the matching case to the RULE_EVAL switch below.
 *
 * Achievements are intentionally non-trivial to earn. Anyone who hits 100
 * approved posts or 1000 favorites has put in serious work; not a participation
 * trophy.
 */
class AchievementService
{
    /** Evaluate every auto-criteria for a user and award newly-met ones. */
    public function evaluateUser(User $user): array
    {
        $awarded = [];
        $badges = DB::table('badges')
            ->where('is_auto', true)
            ->whereNotNull('criteria_rule')
            ->get();

        // Already-earned set so we don't re-award.
        $earned = DB::table('user_badges')
            ->where('user_id', $user->id)
            ->pluck('badge_id')
            ->flip();

        foreach ($badges as $b) {
            if (isset($earned[$b->id])) continue;
            if ($this->ruleMet($user, $b->criteria_rule, (int) $b->criteria_value)) {
                DB::table('user_badges')->insertOrIgnore([
                    'user_id'    => $user->id,
                    'badge_id'   => $b->id,
                    'awarded_at' => now(),
                    'awarded_by' => null,
                ]);
                // Drop a notification so the bell lights up.
                DB::table('notifications')->insert([
                    'user_id' => $user->id,
                    'type'    => 'badge_awarded',
                    'data'    => json_encode([
                        'badge_slug' => $b->slug,
                        'badge_name' => $b->name,
                        'badge_icon' => $b->icon,
                    ]),
                    'created_at' => now(),
                ]);
                $awarded[] = $b->slug;
            }
        }
        return $awarded;
    }

    private function ruleMet(User $user, string $rule, int $value): bool
    {
        return match ($rule) {
            // ---- Volume achievements ----
            'approved_posts' => $this->approvedPostCount($user) >= $value,

            // 1000+ total favorites across all of a user's posts.
            'total_favs'     => DB::table('posts')
                ->where('uploader_id', $user->id)
                ->where('status', 'active')
                ->whereNull('deleted_at')
                ->sum('fav_count') >= $value,

            // Distinct anime series the user has posted from.
            'series_span'    => $this->distinctSeriesCount($user) >= $value,

            // Followers
            'follower_count' => DB::table('follows')->where('followee_id', $user->id)->count() >= $value,

            // Blog
            'blog_posts'     => DB::table('blog_posts')
                ->where('author_id', $user->id)
                ->where('status', 'published')
                ->count() >= $value,

            // ---- Streak / time-based ----
            // Posted on $value distinct days in the last $value days.
            'daily_streak'   => $this->dailyStreak($user, $value),

            // Account is older than $value days AND user has at least 1 approved post.
            'veteran_days'   => $user->created_at <= now()->subDays($value)
                && $this->approvedPostCount($user) >= 1,

            // ---- Manual-only (no auto rule) ----
            default => false,
        };
    }

    private function approvedPostCount(User $user): int
    {
        return DB::table('posts')
            ->where('uploader_id', $user->id)
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->count();
    }

    private function distinctSeriesCount(User $user): int
    {
        // For each of the user's posts, take the (any) copyright tag id in tag_ids,
        // then count distinct.
        return DB::select(<<<'SQL'
            SELECT COUNT(DISTINCT t.id) AS n
            FROM posts p
            JOIN tags t ON t.id = ANY(p.tag_ids)
            WHERE p.uploader_id = ?
              AND p.status = 'active'
              AND p.deleted_at IS NULL
              AND t.category = 'copyright'
        SQL, [$user->id])[0]->n ?? 0;
    }

    private function dailyStreak(User $user, int $days): bool
    {
        // Did user post on every one of the last $days days?
        $found = DB::table('posts')
            ->where('uploader_id', $user->id)
            ->whereNull('deleted_at')
            ->where('created_at', '>=', now()->subDays($days))
            ->selectRaw('COUNT(DISTINCT DATE(created_at)) AS days')
            ->value('days');
        return (int) $found >= $days;
    }
}
