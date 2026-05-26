<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Nightly: re-check every auto-awarded achievement.
Schedule::command('waifu:award-achievements')
    ->dailyAt('03:30')
    ->withoutOverlapping()
    ->runInBackground();

// Nightly: dispatch the anime catalog refresh job onto Horizon so it doesn't
// block the scheduler. The job itself has its own lock; the cron only fires
// the dispatch.
Schedule::job(new \App\Jobs\RefreshAnimeCatalog())
    ->dailyAt('04:00')
    ->name('refresh-anime-catalog')
    ->withoutOverlapping();
