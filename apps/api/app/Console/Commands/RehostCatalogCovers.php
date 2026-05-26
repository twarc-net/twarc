<?php

namespace App\Console\Commands;

use App\Models\AnimeMeta;
use App\Models\CharacterMeta;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Download every external (MAL CDN) anime cover and character portrait into
 * our own storage so we own the assets.
 *
 *   php artisan waifu:rehost-covers
 *   php artisan waifu:rehost-covers --type=anime
 *   php artisan waifu:rehost-covers --type=character
 *   php artisan waifu:rehost-covers --limit=500 --sleep-ms=100
 *
 * Why: hotlinking to cdn.myanimelist.net means MAL can rate-limit / block us
 * by referrer, leaks user IPs to MAL, and gives us no control over caching.
 *
 * Storage shape (mirrors the post uploader for consistency):
 *   storage/app/public/catalog/<type>/<sha[0..1]>/<sha[2..5]>/<sha>.<ext>
 * Public URL (served by nginx via the existing /storage/ symlink):
 *   https://twarc.net/storage/catalog/<type>/.../<sha>.<ext>
 *
 * Idempotent: skips rows whose cover_url no longer points at MAL.
 * Content-addressed by sha256 so the same image (e.g. shared between Season 1
 * and Season 2 covers) is stored exactly once.
 */
class RehostCatalogCovers extends Command
{
    protected $signature = 'waifu:rehost-covers
        {--type=both       : anime | character | both}
        {--limit=0         : max rows to process this run (0 = no limit)}
        {--sleep-ms=80     : ms between downloads (be polite to MAL CDN)}
        {--retry=2         : retries per failed download}';

    protected $description = 'Download external cover/portrait images into our own storage';

    private const PUBLIC_BASE = 'catalog'; // under storage/app/public/
    private const ORIGIN_HOST = 'cdn.myanimelist.net';

    public function handle(): int
    {
        $type    = $this->option('type');
        $limit   = (int) $this->option('limit');
        $sleepUs = (int) $this->option('sleep-ms') * 1000;
        $retries = (int) $this->option('retry');

        $appUrl = rtrim((string) config('app.url'), '/');
        $disk   = Storage::disk('public');

        $rehosted = 0; $skipped = 0; $failed = 0;

        if ($type === 'anime' || $type === 'both') {
            $this->info("→ Rehosting anime covers");
            $q = AnimeMeta::query()
                ->whereNotNull('cover_url')
                ->where('cover_url', 'LIKE', '%' . self::ORIGIN_HOST . '%');
            $total = (clone $q)->count();
            if ($limit > 0 && $limit < $total) $total = $limit;
            $bar = $this->output->createProgressBar($total);
            $bar->setFormat('  %current%/%max% [%bar%] %percent:3s%% %message%');
            $bar->start();

            $q->chunkById(200, function ($rows) use ($disk, $appUrl, &$rehosted, &$skipped, &$failed, $sleepUs, $retries, $bar, $limit) {
                foreach ($rows as $m) {
                    if ($limit > 0 && $rehosted + $skipped + $failed >= $limit) return false;
                    $res = $this->rehost($m->cover_url, 'anime', $disk, $appUrl, $retries);
                    if ($res === 'ok')   { $m->cover_url = $res === 'ok' ? $this->lastUrl : $m->cover_url; }
                    if ($this->lastUrl) {
                        $m->cover_url = $this->lastUrl;
                        $m->save();
                        $rehosted++;
                        $bar->setMessage("✓ {$m->title_english}");
                    } elseif ($res === 'skip') {
                        $skipped++;
                    } else {
                        $failed++;
                        $bar->setMessage("FAIL {$m->title_english}");
                    }
                    $bar->advance();
                    usleep($sleepUs);
                }
            }, 'tag_id');
            $bar->finish();
            $this->newLine(2);
        }

        if ($type === 'character' || $type === 'both') {
            $this->info("→ Rehosting character portraits");
            $q = CharacterMeta::query()
                ->whereNotNull('image_url')
                ->where('image_url', 'LIKE', '%' . self::ORIGIN_HOST . '%');
            $total = (clone $q)->count();
            if ($limit > 0 && $limit < $total) $total = $limit;
            $bar = $this->output->createProgressBar($total);
            $bar->setFormat('  %current%/%max% [%bar%] %percent:3s%% %message%');
            $bar->start();

            $q->chunkById(200, function ($rows) use ($disk, $appUrl, &$rehosted, &$skipped, &$failed, $sleepUs, $retries, $bar, $limit) {
                foreach ($rows as $m) {
                    if ($limit > 0 && $rehosted + $skipped + $failed >= $limit) return false;
                    $res = $this->rehost($m->image_url, 'character', $disk, $appUrl, $retries);
                    if ($this->lastUrl) {
                        $m->image_url = $this->lastUrl;
                        $m->save();
                        $rehosted++;
                        $bar->setMessage("✓ {$m->name_english}");
                    } elseif ($res === 'skip') {
                        $skipped++;
                    } else {
                        $failed++;
                        $bar->setMessage("FAIL {$m->name_english}");
                    }
                    $bar->advance();
                    usleep($sleepUs);
                }
            }, 'tag_id');
            $bar->finish();
            $this->newLine(2);
        }

        $this->info("rehosted: {$rehosted} · skipped: {$skipped} · failed: {$failed}");
        return self::SUCCESS;
    }

    private ?string $lastUrl = null;

    /**
     * Fetch one image. Returns 'ok' on success (with $this->lastUrl set to
     * the new public URL), 'skip' if input is unsuitable, 'fail' on error.
     */
    private function rehost(string $sourceUrl, string $type, $disk, string $appUrl, int $retries): string
    {
        $this->lastUrl = null;
        if (! str_contains($sourceUrl, self::ORIGIN_HOST)) return 'skip';

        // Determine extension from URL path (strip query string).
        $path = parse_url($sourceUrl, PHP_URL_PATH) ?: '';
        $ext  = strtolower(pathinfo($path, PATHINFO_EXTENSION) ?: 'jpg');
        if (! in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) $ext = 'jpg';

        // Fetch
        $bytes = null;
        for ($i = 0; $i <= $retries; $i++) {
            $bytes = $this->fetch($sourceUrl);
            if ($bytes !== null && strlen($bytes) > 200) break;
            usleep(500_000);
        }
        if ($bytes === null || strlen($bytes) < 200) return 'fail';

        // Content-address by sha256
        $sha   = hash('sha256', $bytes);
        $a     = substr($sha, 0, 2);
        $b     = substr($sha, 2, 4);
        $relPath = self::PUBLIC_BASE . "/{$type}/{$a}/{$b}/{$sha}.{$ext}";

        if (! $disk->exists($relPath)) {
            $disk->put($relPath, $bytes);
        }

        // Public URL
        $this->lastUrl = "{$appUrl}/storage/{$relPath}";
        return 'ok';
    }

    private function fetch(string $url): ?string
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_USERAGENT      => 'twarc.net/1.0 (catalog cover rehost)',
            CURLOPT_HTTPHEADER     => [
                'Accept: image/jpeg,image/webp,image/png,image/*;q=0.9,*/*;q=0.5',
                'Referer: https://myanimelist.net/',
            ],
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code !== 200 || ! is_string($body)) return null;
        return $body;
    }
}
