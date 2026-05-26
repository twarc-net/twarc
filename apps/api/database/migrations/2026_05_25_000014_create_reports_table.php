<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE reports (
                id          BIGSERIAL PRIMARY KEY,
                reporter_id BIGINT REFERENCES users(id),
                post_id     BIGINT REFERENCES posts(id) ON DELETE CASCADE,
                comment_id  BIGINT REFERENCES comments(id) ON DELETE CASCADE,
                user_id     BIGINT REFERENCES users(id),
                reason      report_reason NOT NULL,
                notes       TEXT,
                status      TEXT NOT NULL DEFAULT 'open',
                resolved_by BIGINT REFERENCES users(id),
                resolved_at TIMESTAMPTZ,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL OR user_id IS NOT NULL)
            )
        ");
        DB::statement("CREATE INDEX idx_reports_status ON reports(status, created_at DESC)");
        DB::statement("CREATE INDEX idx_reports_post ON reports(post_id) WHERE post_id IS NOT NULL");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS reports');
    }
};
