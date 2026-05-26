<?php

namespace App\Console\Commands;

use App\Models\AnimeMeta;
use App\Models\CharacterMeta;
use App\Models\Tag;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Bulk-import anime metadata + character lists from Jikan (unofficial
 * MyAnimeList REST API). Public, no auth, 3 req/s soft cap.
 *
 *   php artisan waifu:jikan --limit=500
 *   php artisan waifu:jikan --limit=2000 --filter=bypopularity
 *   php artisan waifu:jikan --resume-page=20
 *
 * Halal filter (always on):
 *   - DROP if rating ∈ {"R+ - Mild Nudity", "Rx - Hentai"}.
 *   - DROP if explicit_genres non-empty.
 *   - DROP if any genre/theme/demographic name ∈ HARAM_TERMS.
 *
 * Everything else — R-17+ violence/profanity included — is allowed (the user
 * said +16 is fine, just no haram).
 *
 * The importer is idempotent: re-running upserts by mal_id.
 */
class ImportFromJikan extends Command
{
    protected $signature = 'waifu:jikan
        {--limit=500          : how many anime to import this run}
        {--filter=bypopularity : top filter: bypopularity, favorite, airing, upcoming}
        {--mode=top           : top|full|new — top uses /top/anime; full walks /anime by mal_id; new=only since last import}
        {--per-page=25        : page size (Jikan caps at 25 here)}
        {--resume-page=1      : start from this page (for resume)}
        {--sleep-ms=400       : ms between Jikan calls (3 req/s cap)}
        {--max-chars-per-anime=15 : how many top characters per anime to import}
        {--skip-characters    : skip character imports (faster catalog-only sweep)}
        {--streaming-min-members=1000 : fetch streaming links for anime with at least N MAL members (0 = always, very large = never)}';

    protected $description = 'Import anime + character metadata from Jikan (MAL)';

    /** Haram terms — any anime tagged with one of these is dropped. */
    private const HARAM_TERMS = [
        'hentai', 'ecchi', 'erotica', 'harem', 'reverse harem',
        'boys love', 'girls love', 'yaoi', 'yuri',
    ];

    private const BANNED_RATINGS = [
        'R+ - Mild Nudity',
        'Rx - Hentai',
    ];

    /** Non-anime media types that aren't proper shows/movies — skip these. */
    private const SKIP_TYPES = [
        'Music',     // music videos / character songs
        'PV',        // promotional video (just trailers)
        'CM',        // commercial
        'Unknown',   // missing data, usually noise
    ];

    private const BASE = 'https://api.jikan.moe/v4';

    public function handle(): int
    {
        $limit       = (int) $this->option('limit');
        $filter      = $this->option('filter');
        $mode        = $this->option('mode');
        $perPage     = (int) $this->option('per-page');
        $page        = (int) $this->option('resume-page');
        $sleepUs     = (int) $this->option('sleep-ms') * 1000;
        $maxChars      = $this->option('skip-characters') ? 0 : (int) $this->option('max-chars-per-anime');
        $streamingMin  = (int) $this->option('streaming-min-members');

        $imported = 0; $skipped = 0; $failed = 0;
        $bar = $this->output->createProgressBar($limit);
        $bar->setFormat('  %current%/%max% [%bar%] %percent:3s%% %message%');
        $bar->setMessage('starting…');
        $bar->start();

        while ($imported + $skipped < $limit) {
            $url = match ($mode) {
                // Walk every anime on MAL by mal_id ascending — yields the FULL catalog
                // (~25k titles). Use --skip-characters to make this tractable in one pass.
                'full' => self::BASE . "/anime?page={$page}&limit={$perPage}&order_by=mal_id&sort=asc",
                // Only the newest releases since the last import (status: currently airing or recently aired).
                'new'  => self::BASE . "/anime?page={$page}&limit={$perPage}&order_by=mal_id&sort=desc",
                default => self::BASE . "/top/anime?type=tv&filter={$filter}&page={$page}&limit={$perPage}",
            };
            $resp = $this->fetch($url);
            usleep($sleepUs);

            if (empty($resp['data'])) {
                $bar->setMessage("no more results @page={$page}");
                break;
            }

            foreach ($resp['data'] as $anime) {
                if ($imported + $skipped >= $limit) break 2;

                $reason = $this->halalReason($anime);
                if ($reason !== null) {
                    $skipped++;
                    $bar->setMessage("skipped {$anime['title']} ({$reason})");
                    $bar->advance();
                    continue;
                }

                try {
                    $tagId = $this->upsertAnime($anime);

                    // Pull streaming links for anime with enough audience to
                    // likely have them. Tail-end obscurities almost never do.
                    if ($streamingMin >= 0 && ($anime['members'] ?? 0) >= $streamingMin) {
                        $this->importStreamingFor($anime['mal_id'], $tagId, $sleepUs);
                    }

                    if ($maxChars > 0) {
                        $this->importCharactersFor($anime['mal_id'], $tagId, $maxChars, $sleepUs);
                    }
                    $imported++;
                    $bar->setMessage("✓ {$anime['title']}");
                } catch (\Throwable $e) {
                    $failed++;
                    $bar->setMessage("FAIL {$anime['title']}: " . substr($e->getMessage(), 0, 60));
                }
                $bar->advance();
            }

            $page++;
            // Pagination meta tells us when to stop.
            if (! ($resp['pagination']['has_next_page'] ?? false)) {
                $bar->setMessage("end of pagination");
                break;
            }
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("imported: {$imported}  skipped(haram): {$skipped}  failed: {$failed}");
        $this->info("Top anime by score so far: " . AnimeMeta::orderByDesc('score')->limit(5)->get(['tag_id','title_english','score'])->pluck('title_english', 'score')->implode(', '));
        return self::SUCCESS;
    }

    /** Returns null if halal AND properly anime, or a reason string if it should be dropped. */
    private function halalReason(array $a): ?string
    {
        // Non-anime junk: music videos, promotional videos, commercials, unknown.
        if (in_array($a['type'] ?? '', self::SKIP_TYPES, true)) return "type:{$a['type']}";

        // Drop entries that aren't actually approved on MAL (often duplicates/junk).
        if (isset($a['approved']) && $a['approved'] === false) return 'unapproved';

        if (! empty($a['explicit_genres'])) return 'explicit_genres';
        if (in_array($a['rating'] ?? '', self::BANNED_RATINGS, true)) return $a['rating'];

        $names = [];
        foreach (['genres', 'themes', 'demographics'] as $k) {
            foreach ($a[$k] ?? [] as $g) $names[] = strtolower($g['name'] ?? '');
        }
        foreach (self::HARAM_TERMS as $term) {
            if (in_array($term, $names, true)) return "tag:{$term}";
        }
        return null;
    }

    private function upsertAnime(array $a): int
    {
        // Canonical slug from title_english (fallback to romaji title).
        $title = $a['title_english'] ?? $a['title'];
        $slug  = $this->slug($title);
        $malId = (int) $a['mal_id'];

        // If a tag with this slug exists AND it already maps to a DIFFERENT
        // mal_id, we have a slug collision (two distinct MAL anime that
        // happened to slugify identically). Disambiguate the new one with
        // its mal_id suffix so we never overwrite an existing anime's row.
        $tag = Tag::where('name', $slug)->first();
        if ($tag) {
            $existingMeta = AnimeMeta::where('tag_id', $tag->id)->first();
            if ($existingMeta && (int) $existingMeta->mal_id !== $malId) {
                $slug = $slug . '_' . $malId;
                $tag  = Tag::where('name', $slug)->first();
            }
        }

        // Use the existing tag for this slug OR create one.
        if (! $tag) {
            $tag = Tag::create([
                'name'     => $slug,
                'category' => 'copyright',
            ]);
        } elseif ($tag->category !== 'copyright') {
            $tag->update(['category' => 'copyright']);
        }

        $aired = $a['aired'] ?? [];
        $coverUrl = ($a['images']['jpg']['large_image_url'] ?? null) ?: ($a['images']['jpg']['image_url'] ?? null);

        AnimeMeta::updateOrCreate(
            ['tag_id' => $tag->id],
            [
                'mal_id'         => $a['mal_id'],
                'title_english'  => $a['title_english'] ?? null,
                'title_japanese' => $a['title_japanese'] ?? null,
                'title_romaji'   => $a['title'] ?? null,
                'title_synonyms' => $a['title_synonyms'] ?? [],
                'synopsis'       => $a['synopsis'] ?? null,
                'background'     => $a['background'] ?? null,
                'year_start'     => $a['year'] ?? null,
                'season'         => $a['season'] ?? null,
                'episodes'       => $a['episodes'] ?? null,
                'status'         => $a['status'] ?? null,
                'media_type'     => $a['type'] ?? null,
                'source'         => $a['source'] ?? null,
                'age_rating'     => $a['rating'] ?? null,
                'duration_min'   => $this->parseDurationMin($a['duration'] ?? ''),
                'aired_from'     => $aired['from'] ?? null,
                'aired_to'       => $aired['to'] ?? null,
                'score'          => $a['score'] ?? null,
                'scored_by'      => $a['scored_by'] ?? null,
                'mal_rank'       => $a['rank'] ?? null,
                'popularity_rank'=> $a['popularity'] ?? null,
                'members_count'  => $a['members'] ?? null,
                'favorites_count'=> $a['favorites'] ?? null,
                'studios_csv'    => $this->csv($a['studios'] ?? []),
                'producers_csv'  => $this->csv($a['producers'] ?? []),
                'genres'         => array_column($a['genres'] ?? [], 'name'),
                'themes'         => array_column($a['themes'] ?? [], 'name'),
                'demographics'   => array_column($a['demographics'] ?? [], 'name'),
                'cover_url'      => $coverUrl,
                'trailer_youtube_id' => $a['trailer']['youtube_id'] ?? null,
                'is_halal'       => true,
                'imported_at'    => now(),
            ]
        );

        // Wire the tag's cover_sha256 IF none yet (we use the cover_url indirectly
        // in the response shaper). Leave cover_sha256 NULL since the image isn't
        // on our CDN; the controller falls back to AnimeMeta::cover_url.
        return $tag->id;
    }

    /** Fetch /anime/{id}/streaming and store in anime_meta.streaming_links. */
    private function importStreamingFor(int $animeMalId, int $animeTagId, int $sleepUs): void
    {
        $resp = $this->fetch(self::BASE . "/anime/{$animeMalId}/streaming");
        usleep($sleepUs);
        if (empty($resp['data'])) {
            return;
        }
        $links = array_values(array_filter(array_map(
            fn ($s) => isset($s['name'], $s['url']) ? ['name' => $s['name'], 'url' => $s['url']] : null,
            $resp['data']
        )));
        AnimeMeta::where('tag_id', $animeTagId)->update([
            'streaming_links' => json_encode($links),
        ]);
    }

    private function importCharactersFor(int $animeMalId, int $animeTagId, int $maxChars, int $sleepUs): void
    {
        $url = self::BASE . "/anime/{$animeMalId}/characters";
        $resp = $this->fetch($url);
        usleep($sleepUs);
        if (empty($resp['data'])) return;

        // Sort: Main roles first, then by favorites desc.
        $chars = collect($resp['data'])
            ->sortByDesc(fn ($c) => ($c['role'] === 'Main' ? 1_000_000_000 : 0) + (int) ($c['favorites'] ?? 0))
            ->take($maxChars);

        foreach ($chars as $c) {
            $charNode = $c['character'] ?? null;
            if (! $charNode) continue;

            $rawName = $charNode['name'] ?? '';
            $displayName = $this->flipName($rawName);
            if ($displayName === '') continue;

            $slug = $this->slug($displayName);
            if ($slug === '') continue;

            $tag = Tag::where('name', $slug)->first();
            if (! $tag) {
                $tag = Tag::create([
                    'name'     => $slug,
                    'category' => 'character',
                ]);
            } elseif ($tag->category !== 'character') {
                // Don't clobber an existing copyright tag accidentally — bail.
                continue;
            }

            CharacterMeta::updateOrCreate(
                ['tag_id' => $tag->id],
                [
                    'mal_id'         => $charNode['mal_id'],
                    'name_english'   => $displayName,
                    'name_japanese'  => null, // Jikan list endpoint doesn't include this; details endpoint would
                    'favorites_count'=> $c['favorites'] ?? null,
                    'image_url'      => $charNode['images']['jpg']['image_url'] ?? null,
                    'imported_at'    => now(),
                ]
            );

            DB::table('anime_characters')->updateOrInsert(
                ['anime_tag_id' => $animeTagId, 'character_tag_id' => $tag->id],
                ['role' => $c['role'] ?? null, 'favorites' => $c['favorites'] ?? null]
            );
        }
    }

    /** Convert "Ackerman, Mikasa" → "Mikasa Ackerman"; leave single-word names. */
    private function flipName(string $name): string
    {
        $name = trim($name);
        if (! str_contains($name, ',')) return $name;
        [$last, $first] = array_map('trim', explode(',', $name, 2));
        return trim("{$first} {$last}");
    }

    private function slug(string $s): string
    {
        $base = Str::lower(Str::ascii($s));
        $base = preg_replace('/[^a-z0-9]+/', '_', $base);
        $base = trim($base, '_');
        return Str::limit($base, 80, '');
    }

    private function csv(array $items): string
    {
        return implode(', ', array_slice(array_column($items, 'name'), 0, 8));
    }

    private function parseDurationMin(string $s): ?int
    {
        if (! preg_match('/(\d+)\s*min/i', $s, $m)) return null;
        return (int) $m[1];
    }

    private function fetch(string $url): array
    {
        $tries = 0;
        while (true) {
            $tries++;
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT        => 30,
                CURLOPT_USERAGENT      => 'twarc.net/1.0',
                CURLOPT_HTTPHEADER     => ['Accept: application/json'],
            ]);
            $body = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($code === 200 && $body) return json_decode($body, true) ?: [];
            if ($code === 429 && $tries <= 5) { sleep(2 + $tries); continue; }
            if ($tries <= 3 && $code >= 500)  { sleep(1 + $tries); continue; }
            return [];
        }
    }
}
