<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gin');
        DB::statement('CREATE EXTENSION IF NOT EXISTS citext');
        DB::statement('CREATE EXTENSION IF NOT EXISTS pgcrypto');

        DB::statement("CREATE TYPE post_rating AS ENUM ('safe', 'questionable')");
        DB::statement("CREATE TYPE post_status AS ENUM ('pending', 'active', 'flagged', 'deleted')");
        DB::statement("CREATE TYPE tag_category AS ENUM ('general', 'artist', 'copyright', 'character', 'meta')");
        DB::statement("CREATE TYPE user_role AS ENUM ('member', 'contributor', 'moderator', 'admin')");
        DB::statement("CREATE TYPE report_reason AS ENUM ('illegal','underage','ai_generated','mistagged','spam','dmca','other')");
    }

    public function down(): void
    {
        DB::statement('DROP TYPE IF EXISTS report_reason');
        DB::statement('DROP TYPE IF EXISTS user_role');
        DB::statement('DROP TYPE IF EXISTS tag_category');
        DB::statement('DROP TYPE IF EXISTS post_status');
        DB::statement('DROP TYPE IF EXISTS post_rating');
    }
};
