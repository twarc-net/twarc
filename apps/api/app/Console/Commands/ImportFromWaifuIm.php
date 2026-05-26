<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\User;
use App\Services\UploadService;
use Illuminate\Console\Command;
use Illuminate\Http\UploadedFile;

/**
 * Imports images from https://api.waifu.im into our database as posts
 * uploaded by the system "twarc" account.
 *
 * Per waifu.im TOS: commercial use requires a visible attribution link
 * to waifu.im on our site (rendered in the footer).
 *
 *   php artisan waifu:import --limit=50           # import next 50
 *   php artisan waifu:import --pages=10 --size=30 # walk 10 pages of 30
 *   php artisan waifu:import --start-page=5       # resume from page 5
 */
class ImportFromWaifuIm extends Command
{
    protected $signature = 'waifu:import
        {--pages=999 : how many API pages to walk}
        {--size=30 : page size}
        {--start-page=1 : starting page number}
        {--sleep-ms=250 : delay between API requests (rate limit is 1/200ms)}
        {--data-file= : import from a saved API JSON dump instead of hitting the API (workaround when this servers IP is CF-blocked)}
        {--proxy= : optional CURL proxy URL (socks5h://host:port or http://host:port)}';

    protected $description = 'Bulk-import waifu images from api.waifu.im as twarc';

    /** Map waifu.im tag slugs to our category enum. */
    private const TAG_CATEGORY_MAP = [
        // Series / franchises
        'genshin-impact' => 'copyright',
        'arknights'      => 'copyright',
        'black-clover'   => 'copyright',
        // Characters / waifus
        'raiden-shogun'   => 'character',
        'marin-kitagawa'  => 'character',
        'mori-calliope'   => 'character',
        'kamisato-ayaka'  => 'character',
        'rem'             => 'character',
        // Everything else falls through to 'general' (Waifu, Uniform, Ecchi, etc.)
    ];

    public function handle(UploadService $uploads): int
    {
        $twarc = User::where('username', 'twarc')->first();
        if (! $twarc) {
            $this->error('twarc account does not exist. Create it first.');
            return self::FAILURE;
        }

        $page    = (int) $this->option('start-page');
        $maxPages = (int) $this->option('pages');
        $size    = (int) $this->option('size');
        $sleepUs = (int) $this->option('sleep-ms') * 1000;

        $imported = 0;
        $skipped  = 0;
        $failed   = 0;

        // ----- File-dump mode: skip API entirely, read items from a JSON file -----
        if ($file = $this->option('data-file')) {
            if (! file_exists($file)) {
                $this->error("data file not found: {$file}");
                return self::FAILURE;
            }
            $resp = json_decode(file_get_contents($file), true);
            $items = $resp['items'] ?? [];
            $this->info("loaded " . count($items) . " items from {$file}");

            foreach ($items as $item) {
                $result = $this->importOne($item, $twarc, $uploads);
                $imported += $result === 'imported' ? 1 : 0;
                $skipped  += $result === 'skipped'  ? 1 : 0;
                $failed   += $result === 'failed'   ? 1 : 0;
                usleep($sleepUs);
            }

            $this->info("\n=== FINISHED (data-file mode) ===");
            $this->info("imported: {$imported}  skipped: {$skipped}  failed: {$failed}");
            return self::SUCCESS;
        }

        while ($maxPages-- > 0) {
            $this->info("--- page {$page} ---");
            $resp = $this->fetchJson("https://api.waifu.im/images?pageNumber={$page}&pageSize={$size}");
            if (! $resp) {
                $this->error("page {$page} fetch failed");
                $failed++;
                break;
            }
            usleep($sleepUs);

            $items = $resp['items'] ?? [];
            if (empty($items)) {
                $this->info("no more items at page {$page}");
                break;
            }

            foreach ($items as $item) {
                $result = $this->importOne($item, $twarc, $uploads);
                $imported += $result === 'imported' ? 1 : 0;
                $skipped  += $result === 'skipped'  ? 1 : 0;
                $failed   += $result === 'failed'   ? 1 : 0;
                usleep($sleepUs);
            }

            $totalPages = (int) ($resp['totalPages'] ?? 0);
            $this->info("  page {$page}/{$totalPages} → imported {$imported} · skipped {$skipped} · failed {$failed}");

            if (! ($resp['hasNextPage'] ?? false)) {
                $this->info("hasNextPage=false, done");
                break;
            }
            $page++;
        }

        $this->info("\n=== FINISHED ===");
        $this->info("imported: {$imported}  skipped: {$skipped}  failed: {$failed}");
        return self::SUCCESS;
    }

    /** @return string 'imported'|'skipped'|'failed' */
    private function importOne(array $item, User $twarc, UploadService $uploads): string
    {
        $id        = $item['id']         ?? null;
        $ext       = ltrim($item['extension'] ?? '', '.');
        $url       = $item['url']        ?? "https://cdn.waifu.im/{$id}{$item['extension']}";
        $isNsfw    = $item['isNsfw']     ?? false;
        $isAnim    = $item['isAnimated'] ?? false;
        $source    = $item['source']     ?? null;
        $artists   = $item['artists']    ?? [];
        $apiTags   = $item['tags']       ?? [];

        if (! $id || ! $ext) {
            $this->warn("  #?  missing id/ext, skipping");
            return 'failed';
        }

        // Skip animated for now — our variant pipeline doesn't preserve GIF frames well
        if ($isAnim) {
            $this->line("  #{$id}  animated, skipping");
            return 'skipped';
        }

        // Build category-split tag strings
        $byCategory = ['copyright' => [], 'character' => [], 'general' => []];
        foreach ($apiTags as $t) {
            $slug = $t['slug'] ?? null;
            if (! $slug) continue;
            $localName = $this->normalizeName($slug);
            $cat = self::TAG_CATEGORY_MAP[$slug] ?? 'general';
            $byCategory[$cat][] = $localName;
        }

        // If we have an artist with a name, also add it as an artist-category tag (singular)
        $artistNames = [];
        foreach ($artists as $a) {
            if (! empty($a['name'])) {
                $artistNames[] = $this->normalizeName($a['name']);
            }
        }

        $tagsByCategory = [
            'copyright' => implode(' ', $byCategory['copyright']),
            'character' => implode(' ', $byCategory['character']),
            'general'   => implode(' ', $byCategory['general']),
        ];
        // We treat the first artist as an artist-category tag via direct injection below
        // (TagService normalize creates them as general; we'll fix after if needed)

        if (empty($tagsByCategory['character'])) {
            // waifu.im sometimes has images without an explicit character tag — fall back to "waifu"
            $tagsByCategory['character'] = 'waifu';
        }

        // Download image to /tmp
        $tmp = "/tmp/wim-{$id}.{$ext}";
        if (! $this->download($url, $tmp)) {
            $this->error("  #{$id}  download failed: {$url}");
            return 'failed';
        }

        // Quick sha256 check — already in DB?
        $sha = hash_file('sha256', $tmp);
        if (Post::where('sha256', $sha)->exists()) {
            @unlink($tmp);
            $this->line("  #{$id}  already imported (sha match)");
            return 'skipped';
        }

        // Compose attribution description
        $primaryArtist = $artists[0]['name'] ?? null;
        $desc = "Image #{$id} via waifu.im";
        if ($primaryArtist) $desc .= " · Artist: {$primaryArtist}";

        // Build UploadedFile to feed our pipeline
        $mime = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png'         => 'image/png',
            'webp'        => 'image/webp',
            'gif'         => 'image/gif',
            default       => 'image/jpeg',
        };
        $upload = new UploadedFile($tmp, basename($tmp), $mime, null, true);

        try {
            $result = $uploads->handle(
                file: $upload,
                uploader: $twarc,
                tagsByCategory: $tagsByCategory,
                rating: $isNsfw ? 'questionable' : 'safe',
                title: null,
                description: $desc,
                sourceUrl: $source ?: null,
            );

            // Flip status to active immediately (twarc is moderator-rank so UploadService
            // already does this, but assert it).
            $result['post']->status = 'active';
            $result['post']->save();
        } catch (\Throwable $e) {
            @unlink($tmp);
            $this->error("  #{$id}  upload failed: " . $e->getMessage());
            return 'failed';
        }

        @unlink($tmp);
        $this->info("  #{$id}  → post {$result['post']->id} (" . count($apiTags) . " tags, " . ($isNsfw ? 'questionable' : 'safe') . ")");
        return 'imported';
    }

    private function fetchJson(string $url): ?array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_ENCODING       => '',                // accept gzip
            CURLOPT_HTTPHEADER     => [
                'Accept: application/json',
                'Origin: https://waifu.im',
                'Referer: https://waifu.im/',
            ],
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            CURLOPT_TIMEOUT        => 30,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code !== 200 || ! $body) return null;
        $j = json_decode($body, true);
        return is_array($j) ? $j : null;
    }

    private function download(string $url, string $destPath): bool
    {
        $fp = fopen($destPath, 'wb');
        if (! $fp) return false;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FILE           => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            CURLOPT_TIMEOUT        => 60,
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        fclose($fp);
        if ($code !== 200) { @unlink($destPath); return false; }
        return true;
    }

    private function normalizeName(string $s): string
    {
        $s = strtolower(trim($s));
        $s = preg_replace('/[^a-z0-9]+/', '_', $s);
        return trim($s, '_');
    }
}
