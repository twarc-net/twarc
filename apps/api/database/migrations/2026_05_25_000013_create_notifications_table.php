<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE notifications (
                id         BIGSERIAL PRIMARY KEY,
                user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type       TEXT NOT NULL,
                data       JSONB NOT NULL,
                read_at    TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        ");
        DB::statement("CREATE INDEX idx_notif_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL");
        DB::statement("CREATE INDEX idx_notif_user_all ON notifications(user_id, created_at DESC)");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS notifications');
    }
};
