<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AnimeMeta;
use App\Models\CharacterMeta;
use App\Models\ModAction;
use App\Models\Tag;
use App\Services\TagCoverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TagAdminController extends Controller
{
    public function __construct(private readonly TagCoverService $covers) {}

    /** GET /api/admin/tags */
    public function index(Request $request): JsonResponse
    {
        $per = min(200, max(20, (int) $request->query('per_page', 100)));

        $q = Tag::query();
        if ($search = $request->query('q')) $q->where('name', 'ILIKE', "%{$search}%");
        if ($cat = $request->query('category')) $q->where('category', $cat);

        // Default sort makes the admin lists useful: anime by MAL popularity,
        // characters by MAL favorites, everything else by post_count. Without
        // this, MAL-imported tags (all post_count=0) sit at the bottom and
        // /admin/anime looks empty/random.
        if ($cat === 'copyright') {
            $q->leftJoin('anime_meta', 'anime_meta.tag_id', '=', 'tags.id')
              ->select('tags.*')
              ->orderByRaw('COALESCE(anime_meta.members_count, 0) DESC, tags.post_count DESC, tags.name ASC');
        } elseif ($cat === 'character') {
            $q->leftJoin('character_meta', 'character_meta.tag_id', '=', 'tags.id')
              ->select('tags.*')
              ->orderByRaw('COALESCE(character_meta.favorites_count, 0) DESC, tags.post_count DESC, tags.name ASC');
        } else {
            $q->orderByDesc('post_count')->orderBy('name');
        }

        $page = $q->paginate($per);

        // Preload meta in one query each so transform() can fall back to MAL
        // cover URLs without N+1 lookups.
        $ids = collect($page->items())->pluck('id');
        $animeMetaById = $ids->isEmpty() ? [] : AnimeMeta::whereIn('tag_id', $ids)->get()->keyBy('tag_id')->all();
        $charMetaById  = $ids->isEmpty() ? [] : CharacterMeta::whereIn('tag_id', $ids)->get()->keyBy('tag_id')->all();

        return response()->json([
            'data' => array_map(
                fn (Tag $t) => $this->transform($t, $animeMetaById[$t->id] ?? null, $charMetaById[$t->id] ?? null),
                $page->items()
            ),
            'meta' => ['page' => $page->currentPage(), 'total' => $page->total(), 'last_page' => $page->lastPage()],
        ]);
    }

    /** POST /api/admin/tags */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'min:1', 'max:100', 'regex:/^[a-z0-9_()\-]+$/'],
            'category'    => ['required', 'in:general,artist,copyright,character,meta'],
            'description' => ['nullable', 'string', 'max:5000'],
            'is_locked'   => ['sometimes', 'boolean'],
        ]);

        $tag = Tag::firstOrCreate(
            ['name' => strtolower($data['name'])],
            [
                'category'    => $data['category'],
                'description' => $data['description'] ?? null,
                'is_locked'   => $data['is_locked'] ?? false,
            ]
        );

        if (! $tag->wasRecentlyCreated && ! $tag->is_locked) {
            $tag->fill([
                'category'    => $data['category'],
                'description' => $data['description'] ?? $tag->description,
            ])->save();
        }

        ModAction::create([
            'mod_id'      => $request->user()->id,
            'target_type' => 'tag',
            'target_id'   => $tag->id,
            'action'      => $tag->wasRecentlyCreated ? 'create' : 'edit',
            'reason'      => "category={$data['category']}",
        ]);

        return response()->json(['tag' => $this->transform($tag)], $tag->wasRecentlyCreated ? 201 : 200);
    }

    /** PATCH /api/admin/tags/{tag} */
    public function update(Request $request, Tag $tag): JsonResponse
    {
        $data = $request->validate([
            'category'    => ['sometimes', 'in:general,artist,copyright,character,meta'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'is_locked'   => ['sometimes', 'boolean'],
        ]);

        $tag->fill($data)->save();

        ModAction::create([
            'mod_id'      => $request->user()->id,
            'target_type' => 'tag',
            'target_id'   => $tag->id,
            'action'      => 'edit',
            'metadata'    => $data,
        ]);

        return response()->json(['tag' => $this->transform($tag)]);
    }

    /** DELETE /api/admin/tags/{tag}  — removes tag and clears it from every post's tag_ids array */
    public function destroy(Request $request, Tag $tag): JsonResponse
    {
        // Block deletion of reserved/locked tags as a safety rail
        if ($tag->is_locked) {
            return response()->json(['message' => 'Locked tags cannot be deleted. Unlock first.'], 422);
        }

        // Remove this tag id from every post's tag_ids array, recalc tag_count + tag_string
        DB::transaction(function () use ($tag, $request) {
            // 1. Pull tag from posts
            DB::statement(
                "UPDATE posts
                 SET tag_ids = array_remove(tag_ids, ?),
                     tag_count = array_length(array_remove(tag_ids, ?), 1),
                     tag_string = regexp_replace(tag_string, '(^|\\s)' || ? || '(\\s|$)', ' ', 'g')
                 WHERE ? = ANY(tag_ids)",
                [$tag->id, $tag->id, $tag->name, $tag->id]
            );

            // 2. Drop aliases/implications referencing this tag
            DB::table('tag_aliases')->where('consequent_id', $tag->id)->delete();
            DB::table('tag_implications')
                ->where('antecedent_id', $tag->id)
                ->orWhere('consequent_id', $tag->id)
                ->delete();

            // 3. Remove cover files if any (best-effort; file deletion happens before row delete)
            if ($tag->cover_sha256) {
                $this->covers->removeCover($tag);
            }

            // 4. Audit log BEFORE delete (so target_id is still valid)
            ModAction::create([
                'mod_id'      => $request->user()->id,
                'target_type' => 'tag',
                'target_id'   => $tag->id,
                'action'      => 'delete',
                'reason'      => "deleted tag '{$tag->name}' ({$tag->category})",
            ]);

            // 5. Delete the tag row
            $tag->delete();
        });

        return response()->json(['deleted' => true, 'name' => $tag->name]);
    }

    /** POST /api/admin/tags/{tag}/cover  multipart: image */
    public function uploadCover(Request $request, Tag $tag): JsonResponse
    {
        $request->validate(['image' => ['required', 'file', 'image', 'max:15360']]);

        $this->covers->uploadCover($tag, $request->file('image'));

        ModAction::create([
            'mod_id'      => $request->user()->id,
            'target_type' => 'tag',
            'target_id'   => $tag->id,
            'action'      => 'set_cover',
        ]);

        return response()->json(['tag' => $this->transform($tag->fresh())]);
    }

    /** DELETE /api/admin/tags/{tag}/cover */
    public function removeCover(Request $request, Tag $tag): JsonResponse
    {
        $this->covers->removeCover($tag);

        ModAction::create([
            'mod_id'      => $request->user()->id,
            'target_type' => 'tag',
            'target_id'   => $tag->id,
            'action'      => 'remove_cover',
        ]);

        return response()->json(['tag' => $this->transform($tag->fresh())]);
    }

    private function transform(Tag $t, ?AnimeMeta $am = null, ?CharacterMeta $cm = null): array
    {
        // Fall back to MAL CDN cover when no in-house cover exists, so the
        // admin grid actually shows anime/character thumbnails right after
        // an import.
        $coverCard  = $t->coverUrl('card')  ?: ($am?->cover_url) ?: ($cm?->image_url);
        $coverThumb = $t->coverUrl('thumb') ?: ($am?->cover_url) ?: ($cm?->image_url);
        $coverHero  = $t->coverUrl('hero')  ?: ($am?->cover_url) ?: ($cm?->image_url);

        $base = [
            'id'           => $t->id,
            'name'         => $t->name,
            'category'     => $t->category,
            'post_count'   => $t->post_count,
            'view_count'   => $t->view_count,
            'fav_total'    => $t->fav_total,
            'description'  => $t->description,
            'is_locked'    => $t->is_locked,
            'cover_url'    => $coverCard,
            'cover_thumb'  => $coverThumb,
            'cover_hero'   => $coverHero,
            'public_path'  => $t->publicPath(),
        ];
        if ($am) {
            $base['title']         = $am->title_english ?: $am->title_romaji;
            $base['score']         = (float) ($am->score ?? 0);
            $base['mal_rank']      = $am->mal_rank;
            $base['year_start']    = $am->year_start;
            $base['episodes']      = $am->episodes;
            $base['members_count'] = $am->members_count;
        }
        if ($cm) {
            $base['display_name']    = $cm->name_english;
            $base['favorites_count'] = $cm->favorites_count;
        }
        return $base;
    }
}
