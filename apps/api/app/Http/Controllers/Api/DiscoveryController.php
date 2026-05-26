<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnimeMeta;
use App\Models\CharacterMeta;
use App\Models\Post;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Discovery endpoints — list / detail for anime, characters, tags + the
 * home-page aggregation feed.
 */
class DiscoveryController extends Controller
{
    /** GET /api/anime?sort=views|favs|posts&page= */
    public function anime(Request $request): JsonResponse
    {
        return $this->listByCategory($request, 'copyright');
    }

    /** GET /api/characters?sort=… */
    public function characters(Request $request): JsonResponse
    {
        return $this->listByCategory($request, 'character');
    }

    /** GET /api/artists?sort=… */
    public function artists(Request $request): JsonResponse
    {
        return $this->listByCategory($request, 'artist');
    }

    /** GET /api/tags/top?sort=… (general tags only) */
    public function topTags(Request $request): JsonResponse
    {
        return $this->listByCategory($request, 'general');
    }

    private function listByCategory(Request $request, string $category): JsonResponse
    {
        $sort  = $request->query('sort', 'views');
        $per   = min(60, max(12, (int) $request->query('per_page', 24)));
        $genre = $request->query('genre');     // anime only — e.g. "Action"
        $year  = (int) $request->query('year', 0);
        $name  = trim((string) $request->query('q', ''));   // name search filter

        $q = Tag::query()->where('category', $category);

        // Name filter — matches slug, MAL english title, or romaji title.
        if ($name !== '') {
            $like = '%' . $name . '%';
            if ($category === 'copyright') {
                $q->where(function ($w) use ($name, $like) {
                    $w->where('name', 'ILIKE', $like)
                      ->orWhereIn('id', function ($sub) use ($like) {
                          $sub->select('tag_id')->from('anime_meta')
                              ->where(function ($s) use ($like) {
                                  $s->where('title_english', 'ILIKE', $like)
                                    ->orWhere('title_romaji',  'ILIKE', $like);
                              });
                      });
                });
            } elseif ($category === 'character') {
                $q->where(function ($w) use ($name, $like) {
                    $w->where('name', 'ILIKE', $like)
                      ->orWhereIn('id', function ($sub) use ($like) {
                          $sub->select('tag_id')->from('character_meta')
                              ->where('name_english', 'ILIKE', $like);
                      });
                });
            } else {
                $q->where('name', 'ILIKE', $like);
            }
        }

        // Anime-only filter: by genre tag (uses GIN index on anime_meta.genres).
        if ($category === 'copyright' && ($genre || $year)) {
            $q->whereIn('id', function ($sub) use ($genre, $year) {
                $sub->select('tag_id')->from('anime_meta');
                if ($genre) $sub->whereRaw("genres @> ?::jsonb", [json_encode([$genre])]);
                if ($year)  $sub->where('year_start', $year);
            });
        }

        if ($category === 'copyright' && $sort === 'score') {
            // "Top rated" — requires a real popularity floor so obscure shows
            // with a few votes don't outrank widely-watched anime. MAL's own
            // `rank` already incorporates a vote-count threshold, so requiring
            // it matches MAL's ranking philosophy.
            $q->join('anime_meta', 'anime_meta.tag_id', '=', 'tags.id')
              ->whereNotNull('anime_meta.mal_rank')
              ->where('anime_meta.scored_by', '>=', 5000)
              ->select('tags.*')
              ->orderByDesc('anime_meta.score')
              ->orderBy('anime_meta.mal_rank');
        } elseif ($category === 'copyright' && $sort === 'popular') {
            // Popularity by MAL audience size — sorts the FULL catalog (no
            // filter needed; "popular" naturally pushes obscure to the bottom).
            // This is the right default for /anime browse.
            $q->leftJoin('anime_meta', 'anime_meta.tag_id', '=', 'tags.id')
              ->select('tags.*')
              ->orderByRaw('anime_meta.members_count DESC NULLS LAST, tags.name ASC');
        } else {
            $q->orderByRaw(match ($sort) {
                'favs'  => 'fav_total DESC, view_count DESC',
                'posts' => 'post_count DESC',
                'name'  => 'name ASC',
                default => 'view_count DESC, fav_total DESC, post_count DESC',
            });
        }

        $page = $q->paginate($per);

        // For anime lists, preload meta so cards can show score + year inline.
        $animeMetaById = [];
        if ($category === 'copyright') {
            $ids = collect($page->items())->pluck('id')->all();
            $animeMetaById = AnimeMeta::whereIn('tag_id', $ids)->get()->keyBy('tag_id')->all();
        }
        $charMetaById = [];
        if ($category === 'character') {
            $ids = collect($page->items())->pluck('id')->all();
            $charMetaById = CharacterMeta::whereIn('tag_id', $ids)->get()->keyBy('tag_id')->all();
        }

        return response()->json([
            'data' => array_map(
                fn (Tag $t) => $this->tagCard($t, full: false, animeMeta: $animeMetaById[$t->id] ?? null, charMeta: $charMetaById[$t->id] ?? null),
                $page->items()
            ),
            'meta' => ['page' => $page->currentPage(), 'total' => $page->total(), 'last_page' => $page->lastPage()],
        ]);
    }

    /** GET /api/genres — distinct anime genres seen in our catalog, sorted by count. */
    public function genres(): JsonResponse
    {
        $rows = DB::select(<<<'SQL'
            SELECT name, COUNT(*) AS n
            FROM (
                SELECT jsonb_array_elements_text(genres) AS name FROM anime_meta
                UNION ALL
                SELECT jsonb_array_elements_text(themes) AS name FROM anime_meta
            ) AS g
            GROUP BY name
            ORDER BY n DESC, name ASC
            LIMIT 80
        SQL);
        return response()->json([
            'data' => array_map(fn ($r) => ['name' => $r->name, 'count' => (int) $r->n], $rows),
        ]);
    }

    /** GET /api/anime/{name}, /api/characters/{name}, /api/tag/{name} */
    public function tagDetail(Request $request, string $name): JsonResponse
    {
        $name = strtolower(trim($name));
        $tag = Tag::where('name', $name)->first();
        if (! $tag) abort(404);

        // Increment view count (fire-and-forget; no transaction)
        DB::statement('UPDATE tags SET view_count = view_count + 1 WHERE id = ?', [$tag->id]);
        $tag->refresh();

        // Top posts using this tag
        $postQuery = Post::query()
            ->whereRaw('? = ANY(tag_ids)', [$tag->id])
            ->where('status', 'active')
            ->whereNull('deleted_at');

        // Hide questionable from anonymous + opted-out users
        $user = $request->user();
        if (! $user || ! $user->show_questionable) {
            $postQuery->where('rating', 'safe');
        }

        $posts = (clone $postQuery)
            ->orderByDesc('score')
            ->orderByDesc('created_at')
            ->limit(60)
            ->get(['id', 'sha256', 'ext', 'rating', 'width', 'height', 'score', 'fav_count', 'tag_count', 'created_at']);

        $totalPosts = (clone $postQuery)->count();

        // Attach richer metadata depending on category.
        $animeMeta = $tag->category === 'copyright'  ? AnimeMeta::find($tag->id) : null;
        $charMeta  = $tag->category === 'character'  ? CharacterMeta::find($tag->id) : null;

        // For anime: include the character roster (Main first, then by favorites).
        $characters = [];
        if ($animeMeta) {
            $rows = DB::table('anime_characters AS ac')
                ->join('tags AS t', 't.id', '=', 'ac.character_tag_id')
                ->leftJoin('character_meta AS cm', 'cm.tag_id', '=', 'ac.character_tag_id')
                ->where('ac.anime_tag_id', $tag->id)
                ->orderByRaw("CASE WHEN ac.role = 'Main' THEN 0 ELSE 1 END")
                ->orderByDesc('ac.favorites')
                ->select('t.id', 't.name', 'cm.name_english', 'cm.image_url', 'cm.favorites_count', 'ac.role')
                ->limit(60)->get();
            $characters = $rows->map(fn ($r) => [
                'id'              => $r->id,
                'name'            => $r->name,
                'display_name'    => $r->name_english ?: ucwords(str_replace('_', ' ', $r->name)),
                'image_url'       => $r->image_url,
                'favorites_count' => (int) ($r->favorites_count ?? 0),
                'role'            => $r->role,
                'public_path'     => "/character/{$r->name}",
            ])->all();
        }

        // For character: list the anime they appear in.
        $appearsIn = [];
        if ($charMeta) {
            $rows = DB::table('anime_characters AS ac')
                ->join('tags AS t', 't.id', '=', 'ac.anime_tag_id')
                ->leftJoin('anime_meta AS am', 'am.tag_id', '=', 'ac.anime_tag_id')
                ->where('ac.character_tag_id', $tag->id)
                ->orderByDesc('am.score')
                ->select('t.id', 't.name', 'am.title_english', 'am.cover_url', 'am.year_start', 'am.score', 'ac.role')
                ->limit(20)->get();
            $appearsIn = $rows->map(fn ($r) => [
                'id'            => $r->id,
                'name'          => $r->name,
                'display_name'  => $r->title_english ?: ucwords(str_replace('_', ' ', $r->name)),
                'cover_url'     => $r->cover_url,
                'year_start'    => $r->year_start,
                'score'         => (float) ($r->score ?? 0),
                'role'          => $r->role,
                'public_path'   => "/anime/{$r->name}",
            ])->all();
        }

        return response()->json([
            'tag' => $this->tagCard($tag, full: true, animeMeta: $animeMeta, charMeta: $charMeta),
            'anime_info'   => $animeMeta ? $this->animeInfoPayload($animeMeta) : null,
            'character_info' => $charMeta ? $this->characterInfoPayload($charMeta) : null,
            'characters'   => $characters,
            'appears_in'   => $appearsIn,
            'posts' => $posts->map(fn (Post $p) => [
                'id'        => $p->id,
                'sha256'    => $p->sha256,
                'rating'    => $p->rating,
                'width'     => $p->width,
                'height'    => $p->height,
                'score'     => $p->score,
                'fav_count' => $p->fav_count,
                'tag_count' => $p->tag_count,
                'thumb_url' => $p->publicUrl('thumb'),
                'sample_url' => $p->publicUrl('sample'),
                'created_at' => $p->created_at?->toIso8601String(),
            ]),
            'meta' => ['total_posts' => $totalPosts],
        ]);
    }

    /** GET /api/home — sectioned aggregation for the landing page */
    public function home(Request $request): JsonResponse
    {
        $user = $request->user();
        $allowQuestionable = $user && $user->show_questionable;

        $featuredAnime = Tag::where('category', 'copyright')
            ->whereNotNull('cover_sha256')
            ->orderByDesc('view_count')->orderByDesc('post_count')
            ->limit(8)->get();

        // If no anime have covers yet, fall back to just-by-popularity
        if ($featuredAnime->isEmpty()) {
            $featuredAnime = Tag::where('category', 'copyright')
                ->orderByDesc('post_count')->limit(8)->get();
        }

        $topCharacters = Tag::where('category', 'character')
            ->orderByDesc('view_count')->orderByDesc('post_count')
            ->limit(10)->get();

        $trendingTags = Tag::where('category', 'general')
            ->orderByDesc('post_count')
            ->limit(20)->get();

        $latestPosts = Post::query()
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->when(! $allowQuestionable, fn ($q) => $q->where('rating', 'safe'))
            ->orderByDesc('created_at')
            ->limit(18)
            ->get();

        return response()->json([
            'anime'      => $featuredAnime->map(fn (Tag $t) => $this->tagCard($t))->all(),
            'characters' => $topCharacters->map(fn (Tag $t) => $this->tagCard($t))->all(),
            'tags'       => $trendingTags->map(fn (Tag $t) => $this->tagCard($t))->all(),
            'posts'      => $latestPosts->map(fn (Post $p) => [
                'id'        => $p->id,
                'sha256'    => $p->sha256,
                'rating'    => $p->rating,
                'width'     => $p->width,
                'height'    => $p->height,
                'score'     => $p->score,
                'fav_count' => $p->fav_count,
                'tag_count' => $p->tag_count,
                'thumb_url' => $p->publicUrl('thumb'),
                'sample_url' => $p->publicUrl('sample'),
                'created_at' => $p->created_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    /** GET /api/search?q=&limit= */
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 1) {
            return response()->json(['tags' => [], 'posts' => [], 'users' => []]);
        }
        $limit = min(20, max(5, (int) $request->query('limit', 10)));

        // Tag search ranks by:
        //   1. Prefix bucket — slug or any MAL/character title that STARTS with $q
        //      always comes before merely-fuzzy matches. So typing "atta" puts
        //      "attack_on_titan" before any obscure show that just contains "atta".
        //   2. Within the prefix bucket, MAL popularity decides:
        //      - anime → members_count
        //      - character → favorites_count × 5 (different scale)
        //      - other tags → post_count × 1000
        //   3. Trigram similarity as the final tiebreaker (handles typos).
        //
        // Matches anywhere in slug OR in title_english/title_romaji (so
        // "shingeki" finds Attack on Titan) OR in character name_english.
        $like   = '%' . $q . '%';
        $prefix = $q . '%';

        $tagIds = DB::select(<<<'SQL'
            SELECT t.id,
                   -- Bucket 0: exact match on slug or display title (best)
                   -- Bucket 1: prefix match (starts with $q)
                   -- Bucket 2: fuzzy/contains match
                   (CASE
                      WHEN LOWER(t.name)                       = LOWER(:exact1)   THEN 0
                      WHEN LOWER(COALESCE(am.title_english,'')) = LOWER(:exact2)  THEN 0
                      WHEN LOWER(COALESCE(am.title_romaji,''))  = LOWER(:exact3)  THEN 0
                      WHEN LOWER(COALESCE(cm.name_english,''))  = LOWER(:exact4)  THEN 0
                      WHEN t.name           ILIKE :prefix1 THEN 1
                      WHEN am.title_english ILIKE :prefix2 THEN 1
                      WHEN am.title_romaji  ILIKE :prefix3 THEN 1
                      WHEN cm.name_english  ILIKE :prefix4 THEN 1
                      ELSE 2
                    END) AS match_bucket,
                   GREATEST(
                     COALESCE(am.members_count, 0),
                     COALESCE(cm.favorites_count, 0) * 5,
                     t.post_count * 1000
                   ) AS pop_score,
                   similarity(t.name, :q) AS sim
            FROM tags t
            LEFT JOIN anime_meta     am ON am.tag_id = t.id
            LEFT JOIN character_meta cm ON cm.tag_id = t.id
            WHERE t.name           ILIKE :like1
               OR t.name           %     :qsim
               OR am.title_english ILIKE :like2
               OR am.title_romaji  ILIKE :like3
               OR cm.name_english  ILIKE :like4
            ORDER BY match_bucket ASC, pop_score DESC, sim DESC
            LIMIT :lim
        SQL, [
            'exact1'  => $q,      'exact2'  => $q,      'exact3'  => $q,      'exact4'  => $q,
            'prefix1' => $prefix, 'prefix2' => $prefix, 'prefix3' => $prefix, 'prefix4' => $prefix,
            'q'       => $q,
            'qsim'    => $q,
            'like1'   => $like,   'like2'   => $like,   'like3'   => $like,   'like4'   => $like,
            'lim'     => $limit,
        ]);

        $orderedIds = array_map(fn ($r) => $r->id, $tagIds);
        $tags = Tag::whereIn('id', $orderedIds)->get()
            ->keyBy('id')
            ->sortBy(fn ($_t, $id) => array_search($id, $orderedIds, true))
            ->values();

        // Preload anime + character metadata for these tags so search results
        // can show MAL covers, scores, and heart counts inline.
        $animeMetaById = $tags->isEmpty() ? [] :
            AnimeMeta::whereIn('tag_id', $tags->pluck('id'))->get()->keyBy('tag_id')->all();
        $charMetaById  = $tags->isEmpty() ? [] :
            CharacterMeta::whereIn('tag_id', $tags->pluck('id'))->get()->keyBy('tag_id')->all();

        // Users (username, display_name)
        $users = DB::table('users')
            ->whereNull('deleted_at')
            ->where(function ($w) use ($q) {
                $w->where('username', 'ILIKE', "%{$q}%")
                  ->orWhere('display_name', 'ILIKE', "%{$q}%");
            })
            ->limit($limit)
            ->get(['id', 'username', 'display_name', 'avatar_sha256']);

        // Posts via tag_string FTS or title ILIKE
        $user = $request->user();
        $allowQuestionable = $user && $user->show_questionable;

        $posts = Post::query()
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->when(! $allowQuestionable, fn ($pq) => $pq->where('rating', 'safe'))
            ->where(function ($w) use ($q) {
                $w->where('tag_string', 'ILIKE', "%{$q}%")
                  ->orWhere('title', 'ILIKE', "%{$q}%");
            })
            ->orderByDesc('score')
            ->limit($limit)
            ->get();

        return response()->json([
            'tags' => $tags->map(fn (Tag $t) => $this->tagCard(
                $t,
                full: false,
                animeMeta: $animeMetaById[$t->id] ?? null,
                charMeta:  $charMetaById[$t->id]  ?? null,
            ))->all(),
            'users' => $users->map(fn ($u) => [
                'id'           => $u->id,
                'username'     => $u->username,
                'display_name' => $u->display_name,
            ])->all(),
            'posts' => $posts->map(fn (Post $p) => [
                'id'         => $p->id,
                'sha256'     => $p->sha256,
                'rating'     => $p->rating,
                'width'      => $p->width,
                'height'     => $p->height,
                'score'      => $p->score,
                'fav_count'  => $p->fav_count,
                'tag_count'  => $p->tag_count,
                'thumb_url'  => $p->publicUrl('thumb'),
                'sample_url' => $p->publicUrl('sample'),
                'created_at' => $p->created_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    private function tagCard(
        Tag $t,
        bool $full = false,
        ?AnimeMeta $animeMeta = null,
        ?CharacterMeta $charMeta = null,
    ): array {
        // Prefer twarc's own cover variants; fall back to the external MAL CDN cover
        // when we have no in-house image yet (right after the Jikan import).
        $coverCard  = $t->coverUrl('card')  ?: ($animeMeta?->cover_url) ?: ($charMeta?->image_url);
        $coverThumb = $t->coverUrl('thumb') ?: ($animeMeta?->cover_url) ?: ($charMeta?->image_url);
        $coverHero  = $t->coverUrl('hero')  ?: ($animeMeta?->cover_url) ?: ($charMeta?->image_url);

        $base = [
            'id'          => $t->id,
            'name'        => $t->name,
            'category'    => $t->category,
            'post_count'  => $t->post_count,
            'view_count'  => $t->view_count,
            'fav_total'   => $t->fav_total,
            'cover_url'   => $coverCard,
            'cover_thumb' => $coverThumb,
            'public_path' => $t->publicPath(),
        ];
        // For anime cards: bake the SCORE + YEAR + EPISODES on the card itself.
        if ($animeMeta) {
            $base['score']      = (float) ($animeMeta->score ?? 0);
            $base['year_start'] = $animeMeta->year_start;
            $base['episodes']   = $animeMeta->episodes;
            $base['mal_rank']   = $animeMeta->mal_rank;
        }
        if ($charMeta) {
            $base['favorites_count'] = (int) ($charMeta->favorites_count ?? 0);
            $base['display_name']    = $charMeta->name_english ?: ucwords(str_replace('_', ' ', $t->name));
        }
        if ($full) {
            $base['description'] = $t->description;
            $base['cover_hero']  = $coverHero;
        }
        return $base;
    }

    private function animeInfoPayload(AnimeMeta $m): array
    {
        return [
            'mal_id'         => $m->mal_id,
            'title_english'  => $m->title_english,
            'title_japanese' => $m->title_japanese,
            'title_romaji'   => $m->title_romaji,
            'synopsis'       => $m->synopsis,
            'year_start'     => $m->year_start,
            'season'         => $m->season,
            'episodes'       => $m->episodes,
            'status'         => $m->status,
            'media_type'     => $m->media_type,
            'source'         => $m->source,
            'age_rating'     => $m->age_rating,
            'duration_min'   => $m->duration_min,
            'aired_from'     => $m->aired_from?->toDateString(),
            'aired_to'       => $m->aired_to?->toDateString(),
            'score'          => (float) ($m->score ?? 0),
            'scored_by'      => $m->scored_by,
            'mal_rank'       => $m->mal_rank,
            'popularity_rank'=> $m->popularity_rank,
            'members_count'  => $m->members_count,
            'favorites_count'=> $m->favorites_count,
            'studios'        => $m->studios_csv,
            'producers'      => $m->producers_csv,
            'genres'         => $m->genres ?? [],
            'themes'         => $m->themes ?? [],
            'demographics'   => $m->demographics ?? [],
            'cover_url'      => $m->cover_url,
            'trailer_youtube_id'  => $m->trailer_youtube_id,
            'streaming_links'     => $m->streaming_links ?? [],
        ];
    }

    private function characterInfoPayload(CharacterMeta $m): array
    {
        return [
            'mal_id'          => $m->mal_id,
            'name_english'    => $m->name_english,
            'name_japanese'   => $m->name_japanese,
            'description'     => $m->description,
            'favorites_count' => $m->favorites_count,
            'image_url'       => $m->image_url,
        ];
    }
}
