<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seed the auto-awarded achievement badges. Idempotent — safe to re-run.
 *
 * Each row pairs a hard-to-earn criteria with a visual badge that appears on
 * the user's profile after AchievementService::evaluateUser() finds them
 * eligible.
 */
class AchievementsSeeder extends Seeder
{
    public function run(): void
    {
        $achievements = [
            // ---- Approved posts ----
            ['first-post',      'First Brushstroke', '✦', '#7BA9F7', 'Your first post approved.',                'approved_posts',  1,    10],
            ['ten-posts',       'Studio Sketcher',   '✿', '#7BA9F7', '10 approved posts.',                       'approved_posts',  10,   20],
            ['fifty-posts',     'Pro Illustrator',   '★', '#4D8BF5', '50 approved posts.',                       'approved_posts',  50,   30],
            ['hundred-posts',   'Master of the Pen', '✪', '#4D8BF5', '100 approved posts.',                      'approved_posts',  100,  40],
            ['five-hundred',    'Atelier Legend',    '☆', '#2D63C7', '500 approved posts.',                      'approved_posts',  500,  50],

            // ---- Favorites ----
            ['hundred-favs',    'Crowd Favorite',    '♥', '#58E0E8', 'Your work earned 100 total favorites.',    'total_favs',      100,  60],
            ['thousand-favs',   'Beloved Artist',    '♡', '#58E0E8', '1,000 total favorites across your posts.', 'total_favs',      1000, 70],

            // ---- Reach ----
            ['series-collector','Series Collector',  '⊛', '#7BD89F', 'Posted art from 10 different anime.',      'series_span',     10,   80],
            ['lore-curator',    'Lore Curator',      '◆', '#7BD89F', 'Posted art from 25 different anime.',      'series_span',     25,   85],

            // ---- Community ----
            ['ten-followers',   'Recognized Creator','◉', '#7BA9F7', 'Earned 10 followers.',                     'follower_count',  10,   90],
            ['hundred-followers','Fan Favorite',     '⬢', '#4D8BF5', 'Earned 100 followers.',                    'follower_count',  100,  95],

            // ---- Blog ----
            ['first-blog',      'Quill in Hand',     '✎', '#FFB38A', 'Your first blog post published.',          'blog_posts',      1,    100],
            ['ten-blogs',       'Prolific Author',   '✒', '#FFB38A', 'Ten blog posts published.',                'blog_posts',      10,   105],

            // ---- Streaks / loyalty ----
            ['week-streak',     '7-Day Streak',      '⟳', '#58E0E8', 'Posted on each of 7 consecutive days.',    'daily_streak',    7,    110],
            ['month-streak',    '30-Day Streak',     '⟲', '#2BB5BE', 'Posted on each of 30 consecutive days.',   'daily_streak',    30,   115],
            ['veteran-30',      'Established',       '⛩', '#B5C5D9', 'Joined twarc 30+ days ago with ≥1 post.',  'veteran_days',    30,   120],
            ['veteran-365',     'twarc Veteran',     '⛩', '#4D8BF5', 'A year on twarc, still creating.',         'veteran_days',    365,  125],
        ];

        foreach ($achievements as [$slug, $name, $icon, $color, $desc, $rule, $value, $order]) {
            DB::table('badges')->updateOrInsert(
                ['slug' => $slug],
                [
                    'name'           => $name,
                    'icon'           => $icon,
                    'color'          => $color,
                    'description'    => $desc,
                    'is_auto'        => true,
                    'criteria_rule'  => $rule,
                    'criteria_value' => $value,
                    'sort_order'     => $order,
                    'created_at'     => now(),
                ]
            );
        }
    }
}
