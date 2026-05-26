<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE tag_implications (
                id            BIGSERIAL PRIMARY KEY,
                antecedent_id BIGINT NOT NULL REFERENCES tags(id),
                consequent_id BIGINT NOT NULL REFERENCES tags(id),
                created_by    BIGINT REFERENCES users(id),
                created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE(antecedent_id, consequent_id),
                CHECK (antecedent_id <> consequent_id)
            )
        ");
        DB::statement("CREATE INDEX idx_implications_antecedent ON tag_implications(antecedent_id)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS tag_implications');
    }
};
