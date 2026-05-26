<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE post_favorites (
                user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (user_id, post_id)
            )
        ");
        DB::statement("CREATE INDEX idx_favs_post ON post_favorites(post_id)");
        DB::statement("CREATE INDEX idx_favs_user_recent ON post_favorites(user_id, created_at DESC)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS post_favorites');
    }
};
