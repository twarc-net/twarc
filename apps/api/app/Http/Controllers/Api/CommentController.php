<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommentController extends Controller
{
    /** GET /api/posts/{post}/comments — threaded list */
    public function index(Request $request, Post $post): JsonResponse
    {
        $comments = Comment::where('post_id', $post->id)
            ->whereNull('deleted_at')
            ->where('is_hidden', false)
            ->with('user:id,username,display_name,avatar_sha256,is_verified')
            ->orderBy('created_at', 'asc')
            ->limit(500)
            ->get();

        $data = $comments->map(fn (Comment $c) => $this->transform($c))->all();

        return response()->json([
            'data' => $data,
            'meta' => ['total' => count($data)],
        ]);
    }

    public function store(Request $request, Post $post): JsonResponse
    {
        $request->validate([
            'body'      => ['required', 'string', 'min:1', 'max:5000'],
            'parent_id' => ['nullable', 'integer', 'exists:comments,id'],
        ]);

        $body     = trim($request->input('body'));
        $parentId = $request->input('parent_id');
        $user     = $request->user();

        $comment = DB::transaction(function () use ($body, $parentId, $post, $user) {
            $c = Comment::create([
                'post_id'   => $post->id,
                'user_id'   => $user->id,
                'parent_id' => $parentId,
                'body'      => $body,
            ]);
            DB::table('posts')->where('id', $post->id)->increment('comment_count');
            return $c;
        });

        // ---------- Notifications ----------
        // 1) Notify mentioned users (@username)
        $this->notifyMentions($body, $user, $comment, $post);

        // 2) Notify parent comment author on reply
        if ($parentId) {
            $parent = Comment::find($parentId);
            if ($parent && $parent->user_id !== $user->id) {
                DB::table('notifications')->insert([
                    'user_id' => $parent->user_id,
                    'type'    => 'reply',
                    'data'    => json_encode([
                        'comment_id'      => $comment->id,
                        'parent_id'       => $parent->id,
                        'post_id'         => $post->id,
                        'replier_id'      => $user->id,
                        'replier_username'=> $user->username,
                        'replier_display' => $user->display_name,
                        'preview'         => mb_substr(strip_tags($body), 0, 140),
                    ]),
                    'created_at' => now(),
                ]);
            }
        }

        $comment->load('user:id,username,display_name,avatar_sha256,is_verified');
        return response()->json(['comment' => $this->transform($comment)], 201);
    }

    public function destroy(Request $request, Comment $comment): JsonResponse
    {
        if ($comment->user_id !== $request->user()->id && ! $request->user()->isModerator()) {
            abort(403);
        }
        DB::transaction(function () use ($comment) {
            $comment->delete();
            if ($comment->post_id) {
                DB::table('posts')->where('id', $comment->post_id)->decrement('comment_count');
            }
        });

        return response()->json(['message' => 'deleted']);
    }

    // -------------------------------------------------------------------
    // Blog comments — same plumbing, different target.
    // -------------------------------------------------------------------

    /** GET /api/blog/{slug}/comments */
    public function blogIndex(string $slug): JsonResponse
    {
        $bp = BlogPost::where('slug', $slug)->firstOrFail();
        $comments = Comment::where('blog_post_id', $bp->id)
            ->whereNull('deleted_at')
            ->where('is_hidden', false)
            ->with('user:id,username,display_name,avatar_sha256,is_verified')
            ->orderBy('created_at', 'asc')
            ->limit(500)
            ->get();
        return response()->json([
            'data' => $comments->map(fn (Comment $c) => $this->transform($c))->all(),
            'meta' => ['total' => $comments->count()],
        ]);
    }

    /** POST /api/blog/{slug}/comments  body: {body, parent_id?} */
    public function blogStore(Request $request, string $slug): JsonResponse
    {
        $request->validate([
            'body'      => ['required', 'string', 'min:1', 'max:5000'],
            'parent_id' => ['nullable', 'integer', 'exists:comments,id'],
        ]);

        $bp       = BlogPost::where('slug', $slug)->where('status', 'published')->firstOrFail();
        $body     = trim($request->input('body'));
        $parentId = $request->input('parent_id');
        $user     = $request->user();

        $comment = Comment::create([
            'blog_post_id' => $bp->id,
            'user_id'      => $user->id,
            'parent_id'    => $parentId,
            'body'         => $body,
        ]);

        // Notify the blog author on a top-level comment
        if (! $parentId && $bp->author_id !== $user->id) {
            DB::table('notifications')->insert([
                'user_id'    => $bp->author_id,
                'type'       => 'blog_comment',
                'data'       => json_encode([
                    'comment_id' => $comment->id,
                    'blog_slug'  => $bp->slug,
                    'blog_title' => $bp->title,
                    'commenter_id'       => $user->id,
                    'commenter_username' => $user->username,
                    'commenter_display'  => $user->display_name,
                    'preview'    => mb_substr(strip_tags($body), 0, 140),
                    'url'        => "/blog/{$bp->slug}",
                ]),
                'created_at' => now(),
            ]);
        }

        // Notify on reply
        if ($parentId) {
            $parent = Comment::find($parentId);
            if ($parent && $parent->user_id !== $user->id) {
                DB::table('notifications')->insert([
                    'user_id' => $parent->user_id,
                    'type'    => 'reply',
                    'data'    => json_encode([
                        'comment_id'      => $comment->id,
                        'parent_id'       => $parent->id,
                        'blog_slug'       => $bp->slug,
                        'replier_id'      => $user->id,
                        'replier_username'=> $user->username,
                        'replier_display' => $user->display_name,
                        'preview'         => mb_substr(strip_tags($body), 0, 140),
                        'url'             => "/blog/{$bp->slug}",
                    ]),
                    'created_at' => now(),
                ]);
            }
        }

        // Mentions
        $this->notifyMentionsBlog($body, $user, $comment, $bp);

        $comment->load('user:id,username,display_name,avatar_sha256,is_verified');
        return response()->json(['comment' => $this->transform($comment)], 201);
    }

    private function notifyMentionsBlog(string $body, User $author, Comment $comment, BlogPost $bp): void
    {
        preg_match_all('/@([a-z0-9_]{3,30})/i', $body, $m);
        $usernames = array_unique(array_map('strtolower', $m[1] ?? []));
        if (empty($usernames)) return;

        $skipUserIds = [$author->id];
        if ($comment->parent_id) {
            $parentAuthorId = DB::table('comments')->where('id', $comment->parent_id)->value('user_id');
            if ($parentAuthorId) $skipUserIds[] = $parentAuthorId;
        }

        $mentioned = User::whereIn('username', $usernames)
            ->whereNotIn('id', $skipUserIds)
            ->whereNull('deleted_at')
            ->get(['id', 'username', 'display_name']);

        foreach ($mentioned as $u) {
            DB::table('notifications')->insert([
                'user_id' => $u->id,
                'type'    => 'mention',
                'data'    => json_encode([
                    'comment_id'      => $comment->id,
                    'blog_slug'       => $bp->slug,
                    'mentioner_id'    => $author->id,
                    'mentioner_username' => $author->username,
                    'mentioner_display'  => $author->display_name,
                    'preview'         => mb_substr(strip_tags($body), 0, 140),
                    'url'             => "/blog/{$bp->slug}",
                ]),
                'created_at' => now(),
            ]);
        }
    }

    /**
     * Scan body for @username and create a 'mention' notification for each
     * resolvable user (excluding the author and the parent comment author —
     * the parent gets a 'reply' notification instead).
     */
    private function notifyMentions(string $body, User $author, Comment $comment, Post $post): void
    {
        preg_match_all('/@([a-z0-9_]{3,30})/i', $body, $m);
        $usernames = array_unique(array_map('strtolower', $m[1] ?? []));
        if (empty($usernames)) return;

        // Skip the parent's author — they get a 'reply' notif instead
        $skipUserIds = [$author->id];
        if ($comment->parent_id) {
            $parentAuthorId = DB::table('comments')->where('id', $comment->parent_id)->value('user_id');
            if ($parentAuthorId) $skipUserIds[] = $parentAuthorId;
        }

        $mentioned = User::whereIn('username', $usernames)
            ->whereNotIn('id', $skipUserIds)
            ->whereNull('deleted_at')
            ->get(['id', 'username', 'display_name']);

        foreach ($mentioned as $u) {
            DB::table('notifications')->insert([
                'user_id' => $u->id,
                'type'    => 'mention',
                'data'    => json_encode([
                    'comment_id'      => $comment->id,
                    'post_id'         => $post->id,
                    'mentioner_id'    => $author->id,
                    'mentioner_username' => $author->username,
                    'mentioner_display'  => $author->display_name,
                    'preview'         => mb_substr(strip_tags($body), 0, 140),
                ]),
                'created_at' => now(),
            ]);
        }
    }

    private function transform(Comment $c): array
    {
        $u = $c->user;
        return [
            'id'         => $c->id,
            'body'       => $c->body,
            'parent_id'  => $c->parent_id,
            'score'      => $c->score,
            'created_at' => $c->created_at?->toIso8601String(),
            'user'       => $u ? [
                'id'           => $u->id,
                'username'     => $u->username,
                'display_name' => $u->display_name,
                'avatar_thumb' => $u->avatarUrl('thumb'),
                'is_verified'  => (bool) $u->is_verified,
            ] : null,
        ];
    }
}
