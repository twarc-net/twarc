<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE posts (
                id              BIGSERIAL PRIMARY KEY,
                uploader_id     BIGINT NOT NULL REFERENCES users(id),
                sha256          CHAR(64) UNIQUE NOT NULL,
                md5             CHAR(32) NOT NULL,
                perceptual_hash BIGINT,
                ext             VARCHAR(8) NOT NULL,
                mime            VARCHAR(64) NOT NULL,
                width           INT NOT NULL,
                height          INT NOT NULL,
                file_size       BIGINT NOT NULL,
                rating          post_rating NOT NULL DEFAULT 'safe',
                status          post_status NOT NULL DEFAULT 'pending',
                source_url      TEXT,
                parent_id       BIGINT REFERENCES posts(id),
                title           TEXT,
                description     TEXT,
                tag_string      TEXT NOT NULL DEFAULT '',
                tag_ids         BIGINT[] NOT NULL DEFAULT '{}',
                tag_count       INT NOT NULL DEFAULT 0,
                score           INT NOT NULL DEFAULT 0,
                fav_count       INT NOT NULL DEFAULT 0,
                comment_count   INT NOT NULL DEFAULT 0,
                view_count      BIGINT NOT NULL DEFAULT 0,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                deleted_at      TIMESTAMPTZ
            )
        ");

        // Critical search/feed indexes
        DB::statement("CREATE INDEX idx_posts_tag_ids ON posts USING GIN (tag_ids)");
        DB::statement("CREATE INDEX idx_posts_tag_string_fts ON posts USING GIN (to_tsvector('simple', tag_string))");
        DB::statement("CREATE INDEX idx_posts_created ON posts(created_at DESC) WHERE status = 'active'");
        DB::statement("CREATE INDEX idx_posts_score ON posts(score DESC, created_at DESC) WHERE status = 'active'");
        DB::statement("CREATE INDEX idx_posts_rating ON posts(rating, created_at DESC) WHERE status = 'active'");
        DB::statement("CREATE INDEX idx_posts_uploader ON posts(uploader_id, created_at DESC)");
        DB::statement("CREATE INDEX idx_posts_phash ON posts(perceptual_hash) WHERE perceptual_hash IS NOT NULL");
        DB::statement("CREATE INDEX idx_posts_parent ON posts(parent_id) WHERE parent_id IS NOT NULL");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS posts');
    }
};
