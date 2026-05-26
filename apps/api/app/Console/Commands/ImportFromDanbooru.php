<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\User;
use App\Services\HalalGuard;
use App\Services\UploadService;
use Illuminate\Console\Command;
use Illuminate\Http\UploadedFile;

/**
 * Bulk import from Danbooru (https://danbooru.donmai.us) into our database
 * as posts uploaded by the system "twarc" account.
 *
 * Danbooru's tag taxonomy maps directly onto ours:
 *   tag_string_copyright → category=copyright (anime/series)
 *   tag_string_character → category=character (waifu)
 *   tag_string_artist    → category=artist
 *   tag_string_general   → category=general
 *   tag_string_meta      → category=meta
 *
 * Anonymous limit: 500 req/hr global, 10 req/s. Walk via id:<N cursor.
 * Images served from cdn.donmai.us (content-addressed by md5).
 *
 *   php artisan waifu:danbooru                 # import 100 newest SFW posts
 *   php artisan waifu:danbooru --limit=1000    # import 1000
 *   php artisan waifu:danbooru --rating=s,g    # both safe + general (default)
 *   php artisan waifu:danbooru --before-id=5000000  # resume from a specific cursor
 */
class ImportFromDanbooru extends Command
{
    private HalalGuard $halal;

    protected $signature = 'waifu:danbooru
        {--limit=100 : how many images to import this run}
        {--rating=g : Danbooru rating filter (g=general only is the halal default; s adds sensitive)}
        {--before-id= : start walking before this post id (for resume)}
        {--page-size=50 : how many posts to fetch per API call (max 200)}
        {--sleep-ms=250 : ms between API requests (~4/s, well under 10/s cap)}
        {--quality : apply quality filter preset (highres, score:>10, no comics/multi-views, full illustrations only)}
        {--min-score=0 : minimum community score (set to 5-20 to skip low-quality)}
        {--order=newest : newest | score (Danbooru order:score = highest-rated first)}
        {--extra-tags= : extra Danbooru tag filters to AND in (space-separated, +/- prefixes work)}';

    protected $description = 'Bulk import from danbooru.donmai.us as twarc';

    public function handle(UploadService $uploads, HalalGuard $halal): int
    {
        $this->halal = $halal;
        $twarc = User::where('username', 'twarc')->first();
        if (! $twarc) { $this->error('twarc account does not exist'); return self::FAILURE; }

        $limit    = (int) $this->option('limit');
        $rating   = $this->option('rating');
        $pageSize = min(200, max(1, (int) $this->option('page-size')));
        $sleepUs  = (int) $this->option('sleep-ms') * 1000;
        $beforeId = $this->option('before-id') ? (int) $this->option('before-id') : null;

        $ratingParts = collect(explode(',', $rating))
            ->map(fn ($r) => trim($r))
            ->filter()
            ->all();
        // Danbooru tag syntax: rating:s for one, ~rating:s ~rating:g for OR
        $ratingTag = count($ratingParts) === 1
            ? "rating:{$ratingParts[0]}"
            : implode(' ', array_map(fn ($r) => "~rating:{$r}", $ratingParts));

        $imported = 0; $skipped = 0; $failed = 0;
        $cursor = $beforeId;

        // Build the quality preset filter (per the user's research)
        $qualityTags = [];
        if ($this->option('quality')) {
            $qualityTags = [
                'highres',
                '-comic', '-multiple_views', '-face_focus', '-close-up',
                '-bad_anatomy', '-bad_id', '-photoshop_(medium)',
            ];
        }
        $minScore = (int) $this->option('min-score');
        if ($minScore > 0) $qualityTags[] = "score:>={$minScore}";

        if ($extra = $this->option('extra-tags')) {
            foreach (preg_split('/\s+/', trim($extra)) as $t) if ($t) $qualityTags[] = $t;
        }

        $order = $this->option('order');

        while ($imported + $skipped < $limit) {
            // Build query: rating + quality + order/cursor
            $tagsList = array_merge([$ratingTag], $qualityTags);
            if ($order === 'score') {
                // Score-ordered walk uses page numbers, not id cursor (id ordering breaks with order:)
                $tagsList[] = 'order:score';
                $page = $cursor ? (int) $cursor : 1;
                $url = "https://danbooru.donmai.us/posts.json?limit={$pageSize}&page={$page}&tags=" . urlencode(implode(' ', $tagsList));
            } else {
                // Newest-first cursor walk
                if ($cursor) $tagsList[] = "id:<{$cursor}";
                $url = "https://danbooru.donmai.us/posts.json?limit={$pageSize}&tags=" . urlencode(implode(' ', $tagsList));
            }

            $this->line("  fetching: ?tags=" . urldecode(parse_url($url, PHP_URL_QUERY)));
            $items = $this->fetchJson($url);
            usleep($sleepUs);

            if (! is_array($items) || empty($items)) {
                $this->info("no more results, stopping");
                break;
            }

            foreach ($items as $item) {
                if ($imported + $skipped >= $limit) break 2;

                $result = $this->importOne($item, $twarc, $uploads);
                if     ($result === 'imported') $imported++;
                elseif ($result === 'skipped')  $skipped++;
                else                            $failed++;

                // Cursor: id for newest-walk, page number for score-walk
                if ($order !== 'score') $cursor = (int) $item['id'];
                usleep($sleepUs);
            }
            // Score-walk advances per-page
            if ($order === 'score') {
                $cursor = ($cursor ? (int) $cursor : 1) + 1;
            }

            $this->info("  progress: imported={$imported}  skipped={$skipped}  failed={$failed}  cursor=<{$cursor}");
        }

        $this->info("\n=== FINISHED ===");
        $this->info("imported: {$imported}  skipped: {$skipped}  failed: {$failed}  last_cursor: {$cursor}");
        $this->info("resume with:  php artisan waifu:danbooru --before-id={$cursor} --limit=N");
        return self::SUCCESS;
    }

    /** @return string 'imported'|'skipped'|'failed' */
    private function importOne(array $item, User $twarc, UploadService $uploads): string
    {
        $id      = $item['id']        ?? null;
        $ext     = $item['file_ext']  ?? '';
        $fileUrl = $item['file_url']  ?? null;
        $md5     = $item['md5']       ?? null;
        $rating  = $item['rating']    ?? 's';
        $width   = $item['image_width']  ?? 0;
        $height  = $item['image_height'] ?? 0;
        $source  = $item['source']    ?? null;

        if (! $id || ! $fileUrl || ! $md5 || ! in_array($ext, ['jpg','jpeg','png','webp','gif'], true)) {
            $this->line("  #{$id}  unsupported ext={$ext}, skipping");
            return 'skipped';
        }

        // Already imported?  Check md5 — Danbooru's md5 matches what our sha256 *won't*, so
        // dedupe by checking source URL or the actual file sha after download. For speed,
        // pre-check the cdn URL in source_url first.
        if (Post::where('source_url', $fileUrl)->exists()) {
            $this->line("  #{$id}  already imported (source match)");
            return 'skipped';
        }

        // Halal policy: only Danbooru rating:g passes. Sensitive/questionable/explicit are rejected outright.
        if ($rating !== 'g') {
            $this->line("  #{$id}  rating={$rating} not halal, skipping");
            return 'skipped';
        }
        $ourRating = 'safe';

        // Pre-flight tag check using the combined tag string from Danbooru.
        $combinedTags = trim(
            ($item['tag_string'] ?? '') . ' ' . ($item['tag_string_general'] ?? '') . ' ' . ($item['tag_string_meta'] ?? '')
        );
        if ($this->halal->isHaramByTagString($combinedTags)) {
            $bad = $this->halal->offendingTags($combinedTags);
            $this->line("  #{$id}  haram tags [" . implode(' ', array_slice($bad, 0, 4)) . "], skipping");
            return 'skipped';
        }

        // Build category-split tag strings from Danbooru's pre-split fields
        $byCategory = [
            'copyright' => $this->cleanTags($item['tag_string_copyright'] ?? ''),
            'character' => $this->cleanTags($item['tag_string_character'] ?? ''),
            'artist'    => $this->cleanTags($item['tag_string_artist']    ?? ''),
            'general'   => $this->cleanTags($item['tag_string_general']   ?? ''),
            'meta'      => $this->cleanTags($item['tag_string_meta']      ?? ''),
        ];

        // If no character tags from Danbooru, fall back to 'waifu' so the post still has one
        if (empty($byCategory['character'])) $byCategory['character'] = 'waifu';

        // Download to /tmp
        $tmp = "/tmp/dan-{$id}.{$ext}";
        if (! $this->download($fileUrl, $tmp)) {
            $this->error("  #{$id}  download failed");
            return 'failed';
        }

        // sha256 dedupe (deeper than source check)
        $sha = hash_file('sha256', $tmp);
        if (Post::where('sha256', $sha)->exists()) {
            @unlink($tmp);
            return 'skipped';
        }

        $mime = match ($ext) {
            'jpg','jpeg' => 'image/jpeg',
            'png'        => 'image/png',
            'webp'       => 'image/webp',
            'gif'        => 'image/gif',
            default      => 'image/jpeg',
        };
        $upload = new UploadedFile($tmp, basename($tmp), $mime, null, true);

        try {
            $result = $uploads->handle(
                file: $upload,
                uploader: $twarc,
                tagsByCategory: $byCategory,
                rating: $ourRating,
                title: null,
                description: "Danbooru post #{$id}",
                sourceUrl: $source ?: $fileUrl,
            );
            $result['post']->status = 'active';
            $result['post']->save();
        } catch (\Throwable $e) {
            @unlink($tmp);
            $this->error("  #{$id}  upload failed: " . substr($e->getMessage(), 0, 100));
            return 'failed';
        }

        @unlink($tmp);
        $tagCount = array_sum(array_map(fn ($s) => count(preg_split('/\s+/', trim($s)) ?: []), $byCategory));
        $this->line("  #{$id}  → post {$result['post']->id} ({$tagCount} tags, {$ourRating})");
        return 'imported';
    }

    /** Strip junk from a Danbooru tag string. */
    private function cleanTags(string $s): string
    {
        return collect(preg_split('/\s+/', trim($s)))
            ->filter()
            ->map(fn ($t) => strtolower(trim($t)))
            ->filter(fn ($t) => preg_match('/^[a-z0-9_()\-]{1,100}$/', $t))
            ->take(40)  // keep tag counts reasonable
            ->implode(' ');
    }

    private function fetchJson(string $url)
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_ENCODING       => '',
            CURLOPT_USERAGENT      => 'twarc.net waifu-import/1.0 (admin@twarc.net)',
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
            CURLOPT_TIMEOUT        => 30,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code !== 200 || ! $body) {
            $this->warn("  fetch HTTP {$code}");
            return null;
        }
        return json_decode($body, true);
    }

    private function download(string $url, string $destPath): bool
    {
        $fp = fopen($destPath, 'wb');
        if (! $fp) return false;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FILE           => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT      => 'twarc.net waifu-import/1.0',
            CURLOPT_TIMEOUT        => 60,
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        fclose($fp);
        if ($code !== 200) { @unlink($destPath); return false; }
        return true;
    }
}
