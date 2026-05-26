<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE follows (
                follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                followee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (follower_id, followee_id),
                CHECK (follower_id <> followee_id)
            )
        ");
        DB::statement("CREATE INDEX idx_follows_followee ON follows(followee_id)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS follows');
    }
};
