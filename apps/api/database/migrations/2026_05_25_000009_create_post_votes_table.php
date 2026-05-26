<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE post_votes (
                user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                value      SMALLINT NOT NULL CHECK (value IN (-1, 1)),
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (user_id, post_id)
            )
        ");
        DB::statement("CREATE INDEX idx_votes_post ON post_votes(post_id)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS post_votes');
    }
};
