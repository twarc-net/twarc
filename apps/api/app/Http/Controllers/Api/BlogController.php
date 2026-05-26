<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BlogController extends Controller
{
    /** GET /api/blog — public list (only published posts). */
    public function index(Request $r): JsonResponse
    {
        $perPage = min(50, max(1, (int) $r->query('per_page', 12)));
        $query   = BlogPost::query()
            ->with('author:id,username,display_name,avatar_sha256,is_verified')
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->orderByDesc('published_at');

        if ($author = $r->query('author')) {
            $query->whereHas('author', fn ($q) => $q->where('username', $author));
        }

        $page = $query->paginate($perPage);
        return response()->json([
            'data' => collect($page->items())->map(fn ($p) => $this->shape($p, false))->all(),
            'meta' => [
                'page'      => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total'     => $page->total(),
            ],
        ]);
    }

    /** GET /api/blog/{slug} — public detail by slug. */
    public function show(string $slug): JsonResponse
    {
        $post = BlogPost::with('author:id,username,display_name,avatar_sha256,is_verified,bio')
            ->where('slug', $slug)
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->first();

        if (! $post) abort(404, 'Blog post not found');

        // Async view count increment (no transaction blocker for hot read path)
        DB::table('blog_posts')->where('id', $post->id)->increment('view_count');

        return response()->json([
            'post' => $this->shape($post, true),
        ]);
    }

    /** POST /api/blog — authenticated users create a post (goes to pending). */
    public function store(Request $r): JsonResponse
    {
        $u = $r->user();
        if (! $u) abort(401);

        // Body is HTML from the TipTap editor. Cap at 200kB — generous for a
        // long-form essay with images (image URLs only, files are external).
        $data = $r->validate([
            'title'   => 'required|string|min:5|max:200',
            'body'    => 'required|string|min:30|max:200000',
            'excerpt' => 'nullable|string|max:400',
            'cover_url' => 'nullable|url|max:500',
        ]);

        $slug = BlogPost::slugFromTitle($data['title']);

        $post = BlogPost::create([
            'author_id' => $u->id,
            'slug'      => $slug,
            'title'     => trim($data['title']),
            'excerpt'   => $data['excerpt'] ?? null,
            'body'      => $data['body'],
            'cover_url' => $data['cover_url'] ?? null,
            // Staff posts auto-publish; member posts queue for moderation.
            'status'       => $u->isModerator() ? 'published' : 'pending',
            'published_at' => $u->isModerator() ? now() : null,
        ]);

        // Staff posts go live immediately — credit the achievement check now.
        if ($post->status === 'published') {
            app(\App\Services\AchievementService::class)->evaluateUser($u);
        }
        return response()->json(['post' => $this->shape($post->load('author'), true)], 201);
    }

    /** PATCH /api/blog/{id} — author/admin can edit. */
    public function update(Request $r, int $id): JsonResponse
    {
        $u = $r->user(); if (! $u) abort(401);
        $post = BlogPost::findOrFail($id);
        if ($post->author_id !== $u->id && ! $u->isModerator()) abort(403);

        $data = $r->validate([
            'title'   => 'sometimes|string|min:5|max:200',
            'body'    => 'sometimes|string|min:30|max:200000',
            'excerpt' => 'sometimes|nullable|string|max:400',
            'cover_url' => 'sometimes|nullable|url|max:500',
        ]);

        if (isset($data['title']) && $data['title'] !== $post->title) {
            // re-slug to keep canonical
            $post->slug = BlogPost::slugFromTitle($data['title']);
        }

        // Author-initiated edits re-enter the moderation queue unless author is staff.
        if (! $u->isModerator() && $post->status === 'published') {
            $post->status = 'pending';
            $post->published_at = null;
        }

        $post->fill($data)->save();
        return response()->json(['post' => $this->shape($post->load('author'), true)]);
    }

    /** DELETE /api/blog/{id} — author or admin. */
    public function destroy(Request $r, int $id): JsonResponse
    {
        $u = $r->user(); if (! $u) abort(401);
        $post = BlogPost::findOrFail($id);
        if ($post->author_id !== $u->id && ! $u->isModerator()) abort(403);
        $post->delete();
        return response()->json(['ok' => true]);
    }

    /** GET /api/blog/mine — author's own posts (any status). */
    public function mine(Request $r): JsonResponse
    {
        $u = $r->user(); if (! $u) abort(401);
        $posts = BlogPost::where('author_id', $u->id)->orderByDesc('id')->limit(100)->get();
        return response()->json(['data' => $posts->map(fn ($p) => $this->shape($p, false))->all()]);
    }

    /**
     * POST /api/blog/upload-image — accepts an image and returns a public URL
     * the TipTap editor can embed inline. Auth required so we don't host random
     * images for anonymous users.
     */
    public function uploadImage(Request $r): JsonResponse
    {
        $u = $r->user(); if (! $u) abort(401);

        $data = $r->validate([
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:8192'],
        ]);

        $file = $data['image'];
        $sha  = hash_file('sha256', $file->getRealPath());
        $ext  = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'webp');
        $a    = substr($sha, 0, 2);
        $b    = substr($sha, 2, 4);
        $path = "blog/{$a}/{$b}/{$sha}.{$ext}";

        $disk = Storage::disk('public');
        if (! $disk->exists($path)) {
            $disk->put($path, file_get_contents($file->getRealPath()));
        }

        $url = $disk->url($path);
        // Behind Cloudflare so the storage symlink is reachable at /storage/...
        if (str_starts_with($url, '/')) {
            $url = config('app.url') . $url;
        }

        return response()->json(['url' => $url, 'sha256' => $sha], 201);
    }

    /** Admin moderation endpoints — list pending blog posts. */
    public function pending(Request $r): JsonResponse
    {
        $u = $r->user(); if (! $u || ! $u->isModerator()) abort(403);
        $posts = BlogPost::with('author:id,username,display_name')
            ->where('status', 'pending')
            ->orderByDesc('id')
            ->limit(100)->get();
        return response()->json(['data' => $posts->map(fn ($p) => $this->shape($p, true))->all()]);
    }

    public function approve(Request $r, int $id): JsonResponse
    {
        $u = $r->user(); if (! $u || ! $u->isModerator()) abort(403);
        $post = BlogPost::findOrFail($id);
        $post->status = 'published';
        $post->published_at = now();
        $post->save();

        // Notify author + check blog-related achievements (Quill in Hand, Prolific Author).
        DB::table('notifications')->insert([
            'user_id'    => $post->author_id,
            'type'       => 'blog_published',
            'data'       => json_encode(['slug' => $post->slug, 'title' => $post->title]),
            'created_at' => now(),
        ]);
        if ($author = \App\Models\User::find($post->author_id)) {
            app(\App\Services\AchievementService::class)->evaluateUser($author);
        }
        return response()->json(['post' => $this->shape($post, true)]);
    }

    public function reject(Request $r, int $id): JsonResponse
    {
        $u = $r->user(); if (! $u || ! $u->isModerator()) abort(403);
        $post = BlogPost::findOrFail($id);
        $post->delete();
        return response()->json(['ok' => true]);
    }

    /** Public payload shape. */
    private function shape(BlogPost $p, bool $full): array
    {
        $base = [
            'id'           => $p->id,
            'slug'         => $p->slug,
            'title'        => $p->title,
            'excerpt'      => $p->excerpt ?: Str::limit(strip_tags($p->body), 200),
            'cover_url'    => $p->cover_url,
            'status'       => $p->status,
            'view_count'   => $p->view_count,
            'published_at' => optional($p->published_at)?->toAtomString(),
            'created_at'   => $p->created_at?->toAtomString(),
            'updated_at'   => $p->updated_at?->toAtomString(),
        ];
        if ($p->relationLoaded('author') && $p->author) {
            // avatar_url is a method on the User model, not a column — compute it here.
            $base['author'] = [
                'id'           => $p->author->id,
                'username'     => $p->author->username,
                'display_name' => $p->author->display_name,
                'avatar_url'   => $p->author->avatarUrl('card'),
                'avatar_thumb' => $p->author->avatarUrl('thumb'),
                'is_verified'  => (bool) $p->author->is_verified,
                'bio'          => $full ? $p->author->bio : null,
            ];
        }
        if ($full) $base['body'] = $p->body;
        return $base;
    }
}
