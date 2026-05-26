<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE tag_aliases (
                id              BIGSERIAL PRIMARY KEY,
                antecedent_name CITEXT UNIQUE NOT NULL,
                consequent_id   BIGINT NOT NULL REFERENCES tags(id),
                created_by      BIGINT REFERENCES users(id),
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        ");
        DB::statement("CREATE INDEX idx_aliases_consequent ON tag_aliases(consequent_id)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS tag_aliases');
    }
};
