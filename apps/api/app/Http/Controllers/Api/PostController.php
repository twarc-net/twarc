<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\UploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PostController extends Controller
{
    public function __construct(
        private readonly UploadService $uploads,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min(60, max(12, (int) $request->query('per_page', 24)));
        $rating  = $request->query('rating', 'safe');
        $sort    = $request->query('sort', 'new'); // new | top

        $query = Post::query()
            ->where('status', 'active')
            ->whereNull('deleted_at');

        // Rating filter: anonymous + show_questionable=false → safe only
        $user = $request->user();
        if (! $user || ! $user->show_questionable) {
            $query->where('rating', 'safe');
        } else {
            $allowed = $rating === 'all' ? ['safe', 'questionable'] : [$rating];
            $query->whereIn('rating', $allowed);
        }

        // Tag filter via GIN — supports booru-style `tag1 tag2 -exclude_tag`
        if ($tags = $request->query('tags')) {
            $tokens = collect(preg_split('/\s+/', trim($tags)))
                ->filter()->map(fn ($n) => strtolower(trim($n)))->unique()->values();

            $include = $tokens->reject(fn ($t) => str_starts_with($t, '-'))->all();
            $exclude = $tokens->filter(fn ($t) => str_starts_with($t, '-'))
                              ->map(fn ($t) => ltrim($t, '-'))->all();

            // Includes — post must have ALL of these tags (AND)
            if (! empty($include)) {
                $incIds = DB::table('tags')->whereIn('name', $include)->pluck('id')->all();
                if (! empty($incIds)) {
                    $query->whereRaw('tag_ids @> ?::bigint[]', ['{' . implode(',', $incIds) . '}']);
                }
            }

            // Excludes — post must NOT have any of these tags
            if (! empty($exclude)) {
                $excIds = DB::table('tags')->whereIn('name', $exclude)->pluck('id')->all();
                if (! empty($excIds)) {
                    $query->whereRaw('NOT (tag_ids && ?::bigint[])', ['{' . implode(',', $excIds) . '}']);
                }
            }
        }

        $query->orderBy($sort === 'top' ? 'score' : 'created_at', 'desc');

        $page = $query->paginate($perPage);

        return response()->json([
            'data' => $page->items() ? array_map(fn ($p) => $this->transform($p), $page->items()) : [],
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function show(Post $post): JsonResponse
    {
        if ($post->status !== 'active' || $post->deleted_at) {
            abort(404);
        }
        return response()->json(['post' => $this->transform($post, full: true)]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'image'           => ['required', 'file', 'image', 'max:51200'], // 50MB
            'anime_tags'      => ['nullable', 'string', 'max:500'],          // optional: some waifus aren't from anime
            'character_tags'  => ['required', 'string', 'min:1', 'max:500'], // waifu tag — still required
            'tags'            => ['nullable', 'string', 'max:1000'],
            'rating'          => ['required', 'in:safe,questionable'],
            'title'           => ['nullable', 'string', 'max:255'],
            'description'     => ['nullable', 'string', 'max:5000'],
            'source_url'      => ['nullable', 'url:http,https', 'max:500'],
        ], [
            'character_tags.required' => 'Pick or create at least one waifu tag.',
        ]);

        $result = $this->uploads->handle(
            file: $request->file('image'),
            uploader: $request->user(),
            tagsByCategory: [
                'copyright' => $request->input('anime_tags', ''),
                'character' => $request->input('character_tags', ''),
                'general'   => $request->input('tags', '') ?: '',
            ],
            rating: $request->input('rating'),
            title: $request->input('title'),
            description: $request->input('description'),
            sourceUrl: $request->input('source_url'),
        );

        return response()->json([
            'post'       => $this->transform($result['post'], full: true),
            'was_dedupe' => $result['was_dedupe'],
        ], $result['was_dedupe'] ? 200 : 201);
    }

    public function destroy(Request $request, Post $post): JsonResponse
    {
        if ($post->uploader_id !== $request->user()->id && ! $request->user()->isModerator()) {
            abort(403);
        }
        $post->delete();
        return response()->json(['message' => 'deleted']);
    }

    public function update(Request $request, Post $post): JsonResponse
    {
        if ($post->uploader_id !== $request->user()->id && ! $request->user()->isModerator()) {
            abort(403);
        }
        $request->validate([
            'tags'        => ['sometimes', 'string'],
            'rating'      => ['sometimes', 'in:safe,questionable'],
            'title'       => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        $post->fill($request->only(['rating', 'title', 'description']));

        if ($request->has('tags')) {
            $tagSvc = app(\App\Services\TagService::class);
            $td = $tagSvc->normalize($request->input('tags'));
            $post->tag_string = $td['tag_string'];
            $post->tag_ids    = '{' . implode(',', $td['tag_ids']) . '}';
            $post->tag_count  = $td['tag_count'];
        }
        $post->save();

        return response()->json(['post' => $this->transform($post, full: true)]);
    }

    private function transform(Post $p, bool $full = false): array
    {
        $base = [
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
        ];

        if ($full) {
            $base += [
                'title'        => $p->title,
                'description'  => $p->description,
                'source_url'   => $p->source_url,
                'preview_url'  => $p->publicUrl('preview'),
                'original_url' => $p->publicUrl('original'),
                'file_size'    => $p->file_size,
                'ext'          => $p->ext,
                'tag_string'   => $p->tag_string,
                'uploader'     => $p->uploader ? [
                    'id'           => $p->uploader->id,
                    'username'     => $p->uploader->username,
                    'display_name' => $p->uploader->display_name,
                    'avatar_thumb' => $p->uploader->avatarUrl('thumb'),
                    'is_verified'  => (bool) ($p->uploader->is_verified ?? false),
                ] : null,
                'comment_count' => $p->comment_count,
            ];
        }

        return $base;
    }
}
