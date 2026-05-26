<?php

namespace App\Jobs;

use App\Models\AnimeMeta;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Nightly background catalog refresh.
 *
 * Runs on the existing Horizon worker so it doesn't block web traffic. Two
 * passes per run:
 *   1. NEW pass — fetch the newest 200 anime by mal_id desc. Picks up anything
 *      added to MAL since yesterday.
 *   2. REFRESH pass — re-fetch the catalog top-by-popularity (40 items) to
 *      update scores/rank/members for trending titles.
 *
 * Each pass calls the artisan importer in-process with rate-limit-friendly
 * settings (400ms between requests = ~2.5 rps, well under Jikan's 3 rps cap).
 *
 * The job locks via Cache so two overlapping invocations can't run together.
 * If a full-catalog sweep is needed (one-time, ~25k anime), use:
 *   `php artisan waifu:jikan --mode=full --limit=25000 --skip-characters --sleep-ms=400`
 */
class RefreshAnimeCatalog implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 60 * 60;  // 1 hour — Jikan walks are slow
    public int $tries   = 1;

    public function handle(): void
    {
        $lock = Cache::lock('refresh-anime-catalog', 60 * 90); // 90 min
        if (! $lock->get()) {
            Log::info('RefreshAnimeCatalog: another run already in progress, skipping.');
            return;
        }
        try {
            $before = AnimeMeta::count();

            // 1. NEW — most-recently-added anime on MAL.
            Artisan::call('waifu:jikan', [
                '--mode'        => 'new',
                '--limit'       => 200,
                '--sleep-ms'    => 400,
                '--max-chars-per-anime' => 10,
            ]);

            // 2. REFRESH — top-by-popularity, no character work needed.
            Artisan::call('waifu:jikan', [
                '--mode'        => 'top',
                '--filter'      => 'bypopularity',
                '--limit'       => 40,
                '--sleep-ms'    => 400,
                '--skip-characters' => true,
            ]);

            $after = AnimeMeta::count();
            Log::info("RefreshAnimeCatalog finished — added " . max(0, $after - $before) . " new anime; total {$after}.");
        } finally {
            $lock->release();
        }
    }
}
