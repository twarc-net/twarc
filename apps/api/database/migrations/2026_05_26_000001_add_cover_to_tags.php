<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE tags ADD COLUMN cover_sha256 CHAR(64)");
        DB::statement("ALTER TABLE tags ADD COLUMN description TEXT");
        DB::statement("ALTER TABLE tags ADD COLUMN view_count BIGINT NOT NULL DEFAULT 0");
        DB::statement("ALTER TABLE tags ADD COLUMN fav_total BIGINT NOT NULL DEFAULT 0");

        // Index for the "top anime by views" query
        DB::statement("CREATE INDEX idx_tags_views ON tags (category, view_count DESC, post_count DESC)");
        DB::statement("CREATE INDEX idx_tags_fav_total ON tags (category, fav_total DESC) WHERE fav_total > 0");
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS idx_tags_views");
        DB::statement("DROP INDEX IF EXISTS idx_tags_fav_total");
        DB::statement("ALTER TABLE tags DROP COLUMN IF EXISTS cover_sha256");
        DB::statement("ALTER TABLE tags DROP COLUMN IF EXISTS description");
        DB::statement("ALTER TABLE tags DROP COLUMN IF EXISTS view_count");
        DB::statement("ALTER TABLE tags DROP COLUMN IF EXISTS fav_total");
    }
};
