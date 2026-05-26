<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE post_versions (
                id          BIGSERIAL PRIMARY KEY,
                post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                editor_id   BIGINT NOT NULL REFERENCES users(id),
                tag_string  TEXT NOT NULL,
                rating      post_rating NOT NULL,
                source_url  TEXT,
                description TEXT,
                reason      TEXT,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        ");
        DB::statement("CREATE INDEX idx_post_versions_post ON post_versions(post_id, created_at DESC)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS post_versions');
    }
};
