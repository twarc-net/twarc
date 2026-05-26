<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnimeMeta;
use App\Models\Tag;
use App\Models\User;
use App\Models\UserAnimeList;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * User anime lists + favorites. Patterned after MAL/AniList:
 *
 *   GET    /api/me/list                          → my full list
 *   GET    /api/me/list?status=watching          → my list by status
 *   GET    /api/me/list/anime/{name}             → my row for an anime, if any
 *   PUT    /api/me/list/anime/{name}             → upsert status/score/etc.
 *   DELETE /api/me/list/anime/{name}             → remove from list entirely
 *
 * Public read of another user's list (only if their profile is public):
 *   GET    /api/users/{username}/list[?status=…]
 *
 * Favorites are just `is_favorite=true` rows; a user can favorite without
 * choosing a status (the row is created with default `planning`).
 */
class AnimeListController extends Controller
{
    /** GET /api/me/list */
    public function mine(Request $r): JsonResponse
    {
        $u = $r->user();
        if (! $u) abort(401);
        return $this->listFor($u->id, $r->query('status'), true);
    }

    /** GET /api/users/{username}/list */
    public function forUser(Request $r, string $username): JsonResponse
    {
        $target = User::where('username', $username)->whereNull('deleted_at')->firstOrFail();
        return $this->listFor($target->id, $r->query('status'), false);
    }

    /** GET /api/me/list/anime/{name} — returns null if not in user's list. */
    public function get(Request $r, string $name): JsonResponse
    {
        $u = $r->user(); if (! $u) abort(401);
        $tag = Tag::where('name', $name)->where('category', 'copyright')->firstOrFail();
        $row = UserAnimeList::where(['user_id' => $u->id, 'anime_tag_id' => $tag->id])->first();
        return response()->json(['entry' => $row ? $this->shape($row) : null]);
    }

    /** PUT /api/me/list/anime/{name} */
    public function upsert(Request $r, string $name): JsonResponse
    {
        $u = $r->user(); if (! $u) abort(401);
        $tag = Tag::where('name', $name)->where('category', 'copyright')->firstOrFail();

        $data = $r->validate([
            'status'           => ['nullable', 'in:watching,planning,completed,on_hold,dropped'],
            'is_favorite'      => ['nullable', 'boolean'],
            'user_score'       => ['nullable', 'integer', 'min:1', 'max:10'],
            'episodes_watched' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'started_at'       => ['nullable', 'date'],
            'finished_at'      => ['nullable', 'date'],
            'notes'            => ['nullable', 'string', 'max:2000'],
        ]);

        // updateOrCreate is the natural fit here, but we want to preserve
        // existing fields when the caller sends a partial update. So fetch+merge.
        $row = UserAnimeList::firstOrNew(['user_id' => $u->id, 'anime_tag_id' => $tag->id]);
        if (! $row->exists) {
            $row->status = $data['status'] ?? 'planning';
        }

        foreach (['status', 'is_favorite', 'user_score', 'episodes_watched', 'started_at', 'finished_at', 'notes'] as $k) {
            if (array_key_exists($k, $data)) $row->{$k} = $data[$k];
        }

        // Sensible defaults when the user marks something completed.
        if (($data['status'] ?? null) === 'completed' && ! $row->finished_at) {
            $row->finished_at = now()->toDateString();
        }
        $row->save();

        return response()->json(['entry' => $this->shape($row->fresh())], $row->wasRecentlyCreated ? 201 : 200);
    }

    /** DELETE /api/me/list/anime/{name} */
    public function destroy(Request $r, string $name): JsonResponse
    {
        $u = $r->user(); if (! $u) abort(401);
        $tag = Tag::where('name', $name)->where('category', 'copyright')->firstOrFail();
        UserAnimeList::where(['user_id' => $u->id, 'anime_tag_id' => $tag->id])->delete();
        return response()->json(['ok' => true]);
    }

    /** GET /api/me/list/stats — counts per status. Drives the dashboard sidebar. */
    public function stats(Request $r): JsonResponse
    {
        $u = $r->user(); if (! $u) abort(401);
        $rows = DB::table('user_anime_lists')
            ->selectRaw('status, COUNT(*) AS n, COUNT(*) FILTER (WHERE is_favorite) AS favs')
            ->where('user_id', $u->id)
            ->groupBy('status')
            ->get();
        $byStatus = collect(UserAnimeList::STATUSES)
            ->mapWithKeys(fn ($s) => [$s => 0])->all();
        $favs = 0;
        foreach ($rows as $r) {
            $byStatus[$r->status] = (int) $r->n;
            $favs += (int) $r->favs;
        }
        return response()->json([
            'by_status'      => $byStatus,
            'total'          => array_sum($byStatus),
            'favorite_count' => $favs,
        ]);
    }

    private function listFor(int $userId, ?string $status, bool $includePrivateNotes): JsonResponse
    {
        $q = UserAnimeList::query()
            ->where('user_id', $userId)
            ->orderByDesc('is_favorite')
            ->orderByDesc('updated_at');
        if ($status && in_array($status, UserAnimeList::STATUSES, true)) {
            $q->where('status', $status);
        }
        $rows = $q->limit(500)->get();
        return response()->json([
            'data' => $rows->map(fn ($r) => $this->shape($r, $includePrivateNotes))->all(),
        ]);
    }

    private function shape(UserAnimeList $r, bool $includePrivateNotes = true): array
    {
        $tag = Tag::find($r->anime_tag_id);
        $am  = AnimeMeta::find($r->anime_tag_id);
        return [
            'id'               => $r->id,
            'status'           => $r->status,
            'is_favorite'      => (bool) $r->is_favorite,
            'user_score'       => $r->user_score,
            'episodes_watched' => $r->episodes_watched,
            'started_at'       => $r->started_at?->toDateString(),
            'finished_at'      => $r->finished_at?->toDateString(),
            'notes'            => $includePrivateNotes ? $r->notes : null,
            'updated_at'       => $r->updated_at?->toAtomString(),
            'anime' => $tag ? [
                'id'        => $tag->id,
                'name'      => $tag->name,
                'title'     => $am?->title_english ?: str_replace('_', ' ', ucwords($tag->name)),
                'cover_url' => $am?->cover_url,
                'score'     => (float) ($am?->score ?? 0),
                'episodes'  => $am?->episodes,
                'year'      => $am?->year_start,
                'mal_rank'  => $am?->mal_rank,
                'public_path' => "/anime/{$tag->name}",
            ] : null,
        ];
    }
}
