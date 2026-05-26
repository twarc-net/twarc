<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE collections (
                id            BIGSERIAL PRIMARY KEY,
                user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name          TEXT NOT NULL,
                slug          TEXT NOT NULL,
                is_public     BOOLEAN NOT NULL DEFAULT TRUE,
                description   TEXT,
                cover_post_id BIGINT REFERENCES posts(id),
                post_count    INT NOT NULL DEFAULT 0,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE (user_id, slug)
            )
        ");

        DB::statement("
            CREATE TABLE collection_posts (
                collection_id BIGINT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
                post_id       BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                position      INT NOT NULL DEFAULT 0,
                added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (collection_id, post_id)
            )
        ");
        DB::statement("CREATE INDEX idx_collection_posts_pos ON collection_posts(collection_id, position)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS collection_posts');
        DB::statement('DROP TABLE IF EXISTS collections');
    }
};
