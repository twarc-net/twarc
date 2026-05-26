<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE dmca_notices (
                id                BIGSERIAL PRIMARY KEY,
                claimant_name     TEXT NOT NULL,
                claimant_email    TEXT NOT NULL,
                claim_text        TEXT NOT NULL,
                affected_post_ids BIGINT[] NOT NULL,
                status            TEXT NOT NULL DEFAULT 'received',
                received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
                actioned_at       TIMESTAMPTZ,
                actioned_by       BIGINT REFERENCES users(id),
                notes             TEXT
            )
        ");
        DB::statement("CREATE INDEX idx_dmca_status ON dmca_notices(status, received_at DESC)");
        DB::statement("CREATE INDEX idx_dmca_posts ON dmca_notices USING GIN (affected_post_ids)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS dmca_notices');
    }
};
