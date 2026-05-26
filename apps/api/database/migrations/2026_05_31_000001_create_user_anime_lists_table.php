<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Enum first — Postgres prefers explicit types over CHECK constraints
        // because the type can be referenced from indexes and views.
        DB::statement("CREATE TYPE anime_list_status AS ENUM (
            'watching', 'planning', 'completed', 'on_hold', 'dropped'
        )");

        Schema::create('user_anime_lists', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('anime_tag_id')->constrained('tags')->cascadeOnDelete();
            // 1=favorite (sits on top), false=regular list entry.
            $t->boolean('is_favorite')->default(false);
            $t->smallInteger('user_score')->nullable();        // 1..10, null=unrated
            $t->unsignedSmallInteger('episodes_watched')->default(0);
            $t->date('started_at')->nullable();
            $t->date('finished_at')->nullable();
            $t->text('notes')->nullable();
            $t->timestampsTz();

            $t->unique(['user_id', 'anime_tag_id']);
            $t->index(['user_id', 'is_favorite'], 'idx_ual_user_fav');
        });

        // Raw status enum column — Eloquent's enum builder doesn't speak Postgres types.
        DB::statement("ALTER TABLE user_anime_lists ADD COLUMN status anime_list_status NOT NULL DEFAULT 'planning'");
        DB::statement("CREATE INDEX idx_ual_user_status ON user_anime_lists (user_id, status, updated_at DESC)");
    }

    public function down(): void
    {
        Schema::dropIfExists('user_anime_lists');
        DB::statement('DROP TYPE IF EXISTS anime_list_status');
    }
};
