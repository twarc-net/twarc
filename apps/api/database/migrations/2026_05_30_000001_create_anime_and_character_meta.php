<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anime_meta', function (Blueprint $t) {
            // 1:1 with the underlying anime tag (category='copyright')
            $t->foreignId('tag_id')->primary()->constrained('tags')->cascadeOnDelete();
            $t->unsignedInteger('mal_id')->unique();

            $t->string('title_english', 300)->nullable();
            $t->string('title_japanese', 300)->nullable();
            $t->string('title_romaji', 300)->nullable();
            $t->jsonb('title_synonyms')->nullable();

            $t->text('synopsis')->nullable();
            $t->text('background')->nullable();

            $t->smallInteger('year_start')->nullable();
            $t->string('season', 10)->nullable();         // winter|spring|summer|fall
            $t->smallInteger('episodes')->nullable();
            $t->string('status', 30)->nullable();          // Currently Airing / Finished Airing / Not yet aired
            $t->string('media_type', 20)->nullable();      // TV / Movie / OVA / ONA / Special / Music
            $t->string('source', 40)->nullable();          // Manga / Light novel / Original / etc.
            $t->string('age_rating', 40)->nullable();      // G, PG, PG-13, R, R+, Rx (we only store non-haram)
            $t->smallInteger('duration_min')->nullable();
            $t->date('aired_from')->nullable();
            $t->date('aired_to')->nullable();

            $t->decimal('score', 3, 2)->nullable();        // 0.00 - 10.00
            $t->unsignedInteger('scored_by')->nullable();
            $t->unsignedInteger('mal_rank')->nullable();
            $t->unsignedInteger('popularity_rank')->nullable();
            $t->unsignedInteger('members_count')->nullable();
            $t->unsignedInteger('favorites_count')->nullable();

            $t->string('studios_csv', 500)->nullable();    // simple denormalized list
            $t->string('producers_csv', 500)->nullable();
            $t->jsonb('genres')->nullable();               // ["Action","Drama",...]
            $t->jsonb('themes')->nullable();
            $t->jsonb('demographics')->nullable();         // ["Shounen"]

            $t->string('banner_url', 500)->nullable();
            $t->string('cover_url', 500)->nullable();      // MAL CDN cover for the anime
            $t->string('trailer_youtube_id', 40)->nullable();

            $t->boolean('is_halal')->default(true);
            $t->timestampTz('imported_at')->useCurrent();
            $t->timestampsTz();

            $t->index('score', 'idx_anime_score');
            $t->index('mal_rank', 'idx_anime_rank');
            $t->index('popularity_rank', 'idx_anime_pop');
            $t->index('year_start', 'idx_anime_year');
        });

        // GIN on the JSONB arrays for fast genre filtering.
        DB::statement('CREATE INDEX idx_anime_genres ON anime_meta USING GIN (genres jsonb_path_ops)');
        DB::statement('CREATE INDEX idx_anime_themes ON anime_meta USING GIN (themes jsonb_path_ops)');

        Schema::create('character_meta', function (Blueprint $t) {
            $t->foreignId('tag_id')->primary()->constrained('tags')->cascadeOnDelete();
            $t->unsignedInteger('mal_id')->unique();

            $t->string('name_english', 300)->nullable();
            $t->string('name_japanese', 300)->nullable();
            $t->text('description')->nullable();
            $t->unsignedInteger('favorites_count')->nullable();
            $t->string('image_url', 500)->nullable();

            $t->timestampTz('imported_at')->useCurrent();
            $t->timestampsTz();

            $t->index('favorites_count', 'idx_char_favs');
        });

        Schema::create('anime_characters', function (Blueprint $t) {
            $t->foreignId('anime_tag_id')->constrained('tags')->cascadeOnDelete();
            $t->foreignId('character_tag_id')->constrained('tags')->cascadeOnDelete();
            $t->string('role', 20)->nullable();    // Main, Supporting
            $t->unsignedInteger('favorites')->nullable();
            $t->primary(['anime_tag_id', 'character_tag_id']);
            $t->index('character_tag_id', 'idx_ac_char');
            $t->index(['anime_tag_id', 'role'], 'idx_ac_anime_role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anime_characters');
        Schema::dropIfExists('character_meta');
        Schema::dropIfExists('anime_meta');
    }
};
