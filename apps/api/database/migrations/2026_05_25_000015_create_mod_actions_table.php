<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE mod_actions (
                id          BIGSERIAL PRIMARY KEY,
                mod_id      BIGINT NOT NULL REFERENCES users(id),
                target_type TEXT NOT NULL,
                target_id   BIGINT NOT NULL,
                action      TEXT NOT NULL,
                reason      TEXT,
                metadata    JSONB,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        ");
        DB::statement("CREATE INDEX idx_mod_actions_target ON mod_actions(target_type, target_id, created_at DESC)");
        DB::statement("CREATE INDEX idx_mod_actions_mod ON mod_actions(mod_id, created_at DESC)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS mod_actions');
    }
};
