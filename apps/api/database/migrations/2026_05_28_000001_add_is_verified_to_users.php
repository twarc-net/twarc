<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE");

        // Backfill: anyone holding the 'verified_creator' badge is currently verified.
        DB::statement("
            UPDATE users SET is_verified = TRUE
            WHERE id IN (
                SELECT ub.user_id
                FROM user_badges ub
                JOIN badges b ON b.id = ub.badge_id
                WHERE b.slug = 'verified_creator'
            )
        ");

        DB::statement("CREATE INDEX idx_users_verified ON users(is_verified) WHERE is_verified = TRUE");
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS idx_users_verified");
        DB::statement("ALTER TABLE users DROP COLUMN IF EXISTS is_verified");
    }
};
