<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE badges (
                id          BIGSERIAL PRIMARY KEY,
                slug        CITEXT UNIQUE NOT NULL,
                name        TEXT NOT NULL,
                icon        TEXT NOT NULL,        -- emoji or short symbol
                color       TEXT NOT NULL,        -- hex or token name (e.g. 'sakura')
                description TEXT,
                is_auto     BOOLEAN NOT NULL DEFAULT FALSE,
                sort_order  INT NOT NULL DEFAULT 100,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        ");

        DB::statement("
            CREATE TABLE user_badges (
                user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                badge_id    BIGINT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
                awarded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                awarded_by  BIGINT REFERENCES users(id),
                PRIMARY KEY (user_id, badge_id)
            )
        ");
        DB::statement("CREATE INDEX idx_user_badges_user ON user_badges(user_id)");

        // Seed core badges
        DB::table('badges')->insert([
            ['slug' => 'founder',           'name' => 'Founder',           'icon' => '👑', 'color' => 'sakura',  'description' => 'One of the first to build here.',          'is_auto' => false, 'sort_order' => 10,  'created_at' => now()],
            ['slug' => 'admin',             'name' => 'Admin',             'icon' => '◆',  'color' => 'sakura',  'description' => 'Keeps the lights on.',                     'is_auto' => true,  'sort_order' => 20,  'created_at' => now()],
            ['slug' => 'moderator',         'name' => 'Moderator',         'icon' => '▲',  'color' => 'cyber',   'description' => 'Reviews submissions.',                     'is_auto' => true,  'sort_order' => 30,  'created_at' => now()],
            ['slug' => 'verified_creator',  'name' => 'Verified creator',  'icon' => '✓',  'color' => 'matcha',  'description' => 'Identity confirmed by staff.',             'is_auto' => false, 'sort_order' => 40,  'created_at' => now()],
            ['slug' => 'anime_curator',     'name' => 'Anime curator',     'icon' => '⊛',  'color' => 'cyber',   'description' => 'Maintains anime metadata.',                'is_auto' => false, 'sort_order' => 50,  'created_at' => now()],
            ['slug' => 'character_curator', 'name' => 'Character curator', 'icon' => '✿',  'color' => 'sakura',  'description' => 'Maintains character metadata.',            'is_auto' => false, 'sort_order' => 60,  'created_at' => now()],
            ['slug' => 'early_supporter',   'name' => 'Early supporter',   'icon' => '☆',  'color' => 'peach',   'description' => 'Signed up in the first month.',            'is_auto' => true,  'sort_order' => 70,  'created_at' => now()],
            ['slug' => 'first_upload',      'name' => 'First post',        'icon' => '✎',  'color' => 'matcha',  'description' => 'Shared their first work.',                 'is_auto' => true,  'sort_order' => 80,  'created_at' => now()],
            ['slug' => 'prolific',          'name' => 'Prolific',          'icon' => '⚡', 'color' => 'peach',   'description' => '10+ approved uploads.',                    'is_auto' => true,  'sort_order' => 90,  'created_at' => now()],
            ['slug' => 'beloved',           'name' => 'Beloved',           'icon' => '♥',  'color' => 'sakura',  'description' => '100+ favorites received.',                 'is_auto' => true,  'sort_order' => 100, 'created_at' => now()],
        ]);

        // Award auto badges to existing users based on current state
        // Admin badge to admins, mod badge to mods
        DB::statement("
            INSERT INTO user_badges (user_id, badge_id, awarded_at)
            SELECT u.id, b.id, now()
            FROM users u, badges b
            WHERE b.slug = 'admin' AND u.role = 'admin' AND u.deleted_at IS NULL
            ON CONFLICT DO NOTHING
        ");
        DB::statement("
            INSERT INTO user_badges (user_id, badge_id, awarded_at)
            SELECT u.id, b.id, now()
            FROM users u, badges b
            WHERE b.slug = 'moderator' AND u.role = 'moderator' AND u.deleted_at IS NULL
            ON CONFLICT DO NOTHING
        ");
        // Founder badge to user id 1 (mikufan, the first signup)
        DB::statement("
            INSERT INTO user_badges (user_id, badge_id, awarded_at)
            SELECT 1, b.id, now() FROM badges b WHERE b.slug = 'founder'
            ON CONFLICT DO NOTHING
        ");
        // Early supporter to all current users (since we're <30 days old)
        DB::statement("
            INSERT INTO user_badges (user_id, badge_id, awarded_at)
            SELECT u.id, b.id, now() FROM users u, badges b
            WHERE b.slug = 'early_supporter' AND u.deleted_at IS NULL
            ON CONFLICT DO NOTHING
        ");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS user_badges');
        DB::statement('DROP TABLE IF EXISTS badges');
    }
};
