<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE comments (
                id         BIGSERIAL PRIMARY KEY,
                post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                user_id    BIGINT NOT NULL REFERENCES users(id),
                parent_id  BIGINT REFERENCES comments(id),
                body       TEXT NOT NULL,
                score      INT NOT NULL DEFAULT 0,
                is_hidden  BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                deleted_at TIMESTAMPTZ
            )
        ");
        DB::statement("CREATE INDEX idx_comments_post ON comments(post_id, created_at DESC)");
        DB::statement("CREATE INDEX idx_comments_user ON comments(user_id, created_at DESC)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS comments');
    }
};
