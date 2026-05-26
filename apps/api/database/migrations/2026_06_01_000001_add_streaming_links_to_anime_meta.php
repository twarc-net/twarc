<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('anime_meta', function (Blueprint $t) {
            // Array of {name, url} pulled from Jikan /v4/anime/{id}/streaming.
            // Examples: Crunchyroll, Netflix, Funimation, HIDIVE, Hulu, Bilibili.
            $t->jsonb('streaming_links')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('anime_meta', function (Blueprint $t) {
            $t->dropColumn('streaming_links');
        });
    }
};
