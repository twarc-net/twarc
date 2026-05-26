<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Server-side proxy for GIF search.
 *
 * Why: Tenor API shuts down June 30 2026 (no new keys since Jan 2026).
 * We proxy through here so:
 *   - Frontend doesn't need the provider's key (no client-side leak)
 *   - We can swap providers without touching the UI
 *   - We cache aggressively in Redis (5 min) to stay well under any free tier
 *
 * Provider selection (in priority order):
 *   1. KLIPY_API_KEY        — recommended Tenor successor, free forever
 *   2. GIPHY_API_KEY        — free dev tier (100 search/hr, 1000/day)
 *   3. none                 — picker shows a "not configured" message
 */
class GifController extends Controller
{
    /** GET /api/gifs/search?q=…&limit=24 */
    public function search(Request $request): JsonResponse
    {
        $q     = trim((string) $request->query('q', ''));
        $limit = min(50, max(1, (int) $request->query('limit', 24)));

        if ($q === '') return $this->trending($request);

        $key = "gifs:search:" . md5(strtolower($q)) . ":{$limit}";
        $payload = Cache::remember($key, now()->addMinutes(5), function () use ($q, $limit) {
            return $this->fetchProvider('search', ['q' => $q, 'limit' => $limit]);
        });

        return response()->json($payload);
    }

    /** GET /api/gifs/trending?limit=24 */
    public function trending(Request $request): JsonResponse
    {
        $limit = min(50, max(1, (int) $request->query('limit', 24)));
        $key = "gifs:trending:{$limit}";
        $payload = Cache::remember($key, now()->addMinutes(5), function () use ($limit) {
            return $this->fetchProvider('trending', ['limit' => $limit]);
        });
        return response()->json($payload);
    }

    /**
     * Normalize provider responses to:
     *   { provider, results: [{ id, preview_url, full_url, width, height, alt }] }
     */
    private function fetchProvider(string $action, array $params): array
    {
        if ($klipy = config('services.gifs.klipy_api_key')) {
            return $this->fromKlipy($action, $params, $klipy);
        }
        if ($giphy = config('services.gifs.giphy_api_key')) {
            return $this->fromGiphy($action, $params, $giphy);
        }
        return ['provider' => null, 'results' => [], 'configured' => false];
    }

    private function fromGiphy(string $action, array $params, string $key): array
    {
        $base = 'https://api.giphy.com/v1/gifs';
        $endpoint = $action === 'search' ? "{$base}/search" : "{$base}/trending";

        $resp = Http::timeout(8)->get($endpoint, array_merge([
            'api_key' => $key,
            'rating'  => 'g',           // SFW only
            'lang'    => 'en',
        ], $params));

        if (! $resp->ok()) {
            return ['provider' => 'giphy', 'results' => [], 'error' => 'upstream ' . $resp->status()];
        }

        $items = $resp->json('data', []);
        $results = array_map(function ($g) {
            $img = $g['images']['fixed_width'] ?? $g['images']['original'] ?? [];
            $orig = $g['images']['original'] ?? $img;
            return [
                'id'          => $g['id']            ?? null,
                'preview_url' => $img['url']         ?? '',
                'full_url'    => $orig['url']        ?? '',
                'width'       => (int) ($orig['width']  ?? 0),
                'height'      => (int) ($orig['height'] ?? 0),
                'alt'         => $g['title']         ?? '',
            ];
        }, $items);

        return ['provider' => 'giphy', 'results' => array_values(array_filter($results, fn ($r) => $r['full_url']))];
    }

    /**
     * Klipy adapter — placeholder shape based on their public migration guide
     * (https://github.com/klipycom/Migrate-From-Tenor-To-Klipy). Their docs
     * are gated behind partner.klipy.com signup; the exact response field
     * names should be verified once a real key is provisioned. The endpoint
     * paths are educated guesses from publicly known info and should be
     * adjusted to match what /docs/gifs-api returns to an authenticated dev.
     */
    private function fromKlipy(string $action, array $params, string $key): array
    {
        $base = 'https://api.klipy.com/api/v1/' . $key;
        $endpoint = $action === 'search' ? "{$base}/gifs/search" : "{$base}/gifs/trending";

        $resp = Http::timeout(8)
            ->withHeaders(['Accept' => 'application/json'])
            ->get($endpoint, $params);

        if (! $resp->ok()) {
            return ['provider' => 'klipy', 'results' => [], 'error' => 'upstream ' . $resp->status()];
        }
        $items = $resp->json('data.data', $resp->json('data', []));

        $results = array_map(function ($g) {
            // Tolerate several plausible field shapes
            $files = $g['file_meta'] ?? $g['files'] ?? [];
            $thumb = $files['md']['gif'] ?? $files['preview'] ?? $g['preview_url'] ?? null;
            $full  = $files['hd']['gif'] ?? $files['original'] ?? $g['url'] ?? null;
            return [
                'id'          => (string) ($g['id'] ?? $g['slug'] ?? ''),
                'preview_url' => is_array($thumb) ? ($thumb['url'] ?? '') : (string) $thumb,
                'full_url'    => is_array($full)  ? ($full['url']  ?? '') : (string) $full,
                'width'       => (int) ($g['width']  ?? 0),
                'height'      => (int) ($g['height'] ?? 0),
                'alt'         => $g['title'] ?? $g['name'] ?? '',
            ];
        }, $items);

        return ['provider' => 'klipy', 'results' => array_values(array_filter($results, fn ($r) => $r['full_url']))];
    }
}
