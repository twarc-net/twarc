<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            CREATE TABLE users (
                id                BIGSERIAL PRIMARY KEY,
                username          CITEXT UNIQUE NOT NULL,
                email             CITEXT UNIQUE NOT NULL,
                email_verified_at TIMESTAMPTZ,
                password          TEXT NOT NULL,
                remember_token    VARCHAR(100),
                role              user_role NOT NULL DEFAULT 'member',
                display_name      TEXT,
                bio               TEXT,
                avatar_sha256     TEXT,
                show_questionable BOOLEAN NOT NULL DEFAULT FALSE,
                birthdate         DATE,
                created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
                deleted_at        TIMESTAMPTZ
            )
        ");
        DB::statement("CREATE INDEX idx_users_created ON users(created_at DESC) WHERE deleted_at IS NULL");

        // Laravel sessions table (required for session driver if not using redis)
        DB::statement("
            CREATE TABLE sessions (
                id            VARCHAR(255) PRIMARY KEY,
                user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
                ip_address    VARCHAR(45),
                user_agent    TEXT,
                payload       TEXT NOT NULL,
                last_activity INTEGER NOT NULL
            )
        ");
        DB::statement("CREATE INDEX idx_sessions_last_activity ON sessions(last_activity)");
        DB::statement("CREATE INDEX idx_sessions_user ON sessions(user_id)");

        // password reset (Laravel built-in)
        DB::statement("
            CREATE TABLE password_reset_tokens (
                email      VARCHAR(255) PRIMARY KEY,
                token      VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ
            )
        ");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS password_reset_tokens');
        DB::statement('DROP TABLE IF EXISTS sessions');
        DB::statement('DROP TABLE IF EXISTS users');
    }
};
