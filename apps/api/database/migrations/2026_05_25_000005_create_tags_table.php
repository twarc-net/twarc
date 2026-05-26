<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE tags (
                id         BIGSERIAL PRIMARY KEY,
                name       CITEXT UNIQUE NOT NULL,
                category   tag_category NOT NULL DEFAULT 'general',
                post_count INT NOT NULL DEFAULT 0,
                is_locked  BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        ");
        DB::statement("CREATE INDEX idx_tags_category_count ON tags(category, post_count DESC)");
        DB::statement("CREATE INDEX idx_tags_name_trgm ON tags USING GIN (name gin_trgm_ops)");
        DB::statement("CREATE INDEX idx_tags_count ON tags(post_count DESC)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS tags');
    }
};
