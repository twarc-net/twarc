<?php

use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\DiscoveryController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotificationStreamController;
use App\Http\Controllers\Api\GifController;
use App\Http\Controllers\Api\BlogController;
use App\Http\Controllers\Api\AnimeListController;
use App\Http\Controllers\Api\Admin\ModerationController;
use App\Http\Controllers\Api\Admin\UserAdminController;
use App\Http\Controllers\Api\Admin\TagAdminController;
use App\Http\Controllers\Api\Admin\BadgeAdminController;
use App\Http\Middleware\EnsureAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ---------- Public ----------

Route::get('/me', function (Request $request) {
    if (! $request->user()) {
        return response()->json(['user' => null]);
    }
    $u = $request->user();
    return response()->json([
        'user' => [
            'id'                => $u->id,
            'username'          => $u->username,
            'email'             => $u->email,
            'display_name'      => $u->display_name,
            'bio'               => $u->bio,
            'avatar_sha256'     => $u->avatar_sha256,
            'avatar_url'        => $u->avatarUrl('card'),
            'avatar_thumb'      => $u->avatarUrl('thumb'),
            'role'              => $u->role,
            'is_verified'       => (bool) $u->is_verified,
            'show_questionable' => (bool) $u->show_questionable,
            'birthdate'         => $u->birthdate?->toDateString(),
            'created_at'        => $u->created_at?->toIso8601String(),
        ],
    ]);
})->middleware('auth:sanctum');

// GIF picker proxy — env-configured (Klipy / Giphy / none)
Route::get('/gifs/search',   [GifController::class, 'search'])->middleware('throttle:120,1');
Route::get('/gifs/trending', [GifController::class, 'trending'])->middleware('throttle:120,1');

Route::get('/posts',                       [PostController::class, 'index']);
Route::get('/posts/{post}',                [PostController::class, 'show']);
Route::get('/posts/{post}/comments',       [CommentController::class, 'index']);
Route::get('/tags',              [TagController::class, 'index']);
Route::get('/tags/autocomplete', [TagController::class, 'autocomplete']);
Route::get('/users/{username}',           [UserController::class, 'show']);
Route::get('/users/{username}/followers', [FollowController::class, 'followers']);
Route::get('/users/{username}/following', [FollowController::class, 'following']);
Route::get('/users/{username}/list',      [AnimeListController::class, 'forUser']);

// Discovery — anime, characters, tags, home aggregate, search
Route::get('/home',              [DiscoveryController::class, 'home']);
Route::get('/anime',             [DiscoveryController::class, 'anime']);
Route::get('/genres',            [DiscoveryController::class, 'genres']);
Route::get('/characters',        [DiscoveryController::class, 'characters']);
Route::get('/artists',           [DiscoveryController::class, 'artists']);
Route::get('/tags/top',          [DiscoveryController::class, 'topTags']);
Route::get('/anime/{name}',      [DiscoveryController::class, 'tagDetail']);
Route::get('/characters/{name}', [DiscoveryController::class, 'tagDetail']);
Route::get('/tag/{name}',        [DiscoveryController::class, 'tagDetail']);
Route::get('/search',            [DiscoveryController::class, 'search']);

// Blog (public list/show)
Route::get('/blog',                          [BlogController::class, 'index']);
Route::get('/blog/{slug}',                   [BlogController::class, 'show']);
Route::get('/blog/{slug}/comments',          [CommentController::class, 'blogIndex']);

// ---------- Authenticated ----------

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/posts',                   [PostController::class, 'store'])->middleware('throttle:upload');
    Route::patch('/posts/{post}',           [PostController::class, 'update']);
    Route::delete('/posts/{post}',          [PostController::class, 'destroy']);

    Route::post('/posts/{post}/favorite',   [FavoriteController::class, 'store']);
    Route::delete('/posts/{post}/favorite', [FavoriteController::class, 'destroy']);

    Route::post('/posts/{post}/comments',     [CommentController::class, 'store']);
    Route::post('/blog/{slug}/comments',      [CommentController::class, 'blogStore']);
    Route::delete('/comments/{comment}',      [CommentController::class, 'destroy']);

    Route::get('/me/posts', [UserController::class, 'myPosts']);
    Route::get('/me/stats', [UserController::class, 'myStats']);

    // Profile self-management
    Route::patch('/me',         [MeController::class, 'update']);
    Route::post('/me/avatar',   [MeController::class, 'uploadAvatar']);
    Route::delete('/me/avatar', [MeController::class, 'removeAvatar']);

    // Notifications
    Route::get('/me/notifications',               [NotificationController::class, 'index']);
    Route::get('/me/notifications/unread-count',  [NotificationController::class, 'unreadCount']);
    Route::get('/me/notifications/stream',        NotificationStreamController::class);
    Route::post('/me/notifications/read',         [NotificationController::class, 'markRead']);

    // Follow / feed
    Route::post('/users/{username}/follow',   [FollowController::class, 'store']);
    Route::delete('/users/{username}/follow', [FollowController::class, 'destroy']);
    Route::get('/feed',                       [FollowController::class, 'feed']);

    // Anime watchlist / favorites
    Route::get('/me/list',                    [AnimeListController::class, 'mine']);
    Route::get('/me/list/stats',              [AnimeListController::class, 'stats']);
    Route::get('/me/list/anime/{name}',       [AnimeListController::class, 'get']);
    Route::put('/me/list/anime/{name}',       [AnimeListController::class, 'upsert']);
    Route::delete('/me/list/anime/{name}',    [AnimeListController::class, 'destroy']);

    // Blog (authenticated CRUD on own posts)
    Route::get('/blog/me/list',         [BlogController::class, 'mine']);
    Route::post('/blog',                [BlogController::class, 'store'])->middleware('throttle:10,1');
    Route::patch('/blog/{blog}',        [BlogController::class, 'update']);
    Route::delete('/blog/{blog}',       [BlogController::class, 'destroy']);
    Route::post('/blog/upload-image',   [BlogController::class, 'uploadImage'])->middleware('throttle:30,1');

    // ---------- Admin / Moderator ----------
    Route::prefix('admin')->middleware(EnsureAdmin::class . ':moderator')->group(function () {
        Route::get('/stats',                       [ModerationController::class, 'stats']);
        Route::get('/pending',                     [ModerationController::class, 'pending']);
        Route::post('/posts/{post}/approve',       [ModerationController::class, 'approve']);
        Route::post('/posts/{post}/reject',        [ModerationController::class, 'reject']);

        Route::get('/users',                       [UserAdminController::class, 'index']);

        Route::get('/tags',                        [TagAdminController::class, 'index']);
        Route::post('/tags',                       [TagAdminController::class, 'store']);
        Route::patch('/tags/{tag}',                [TagAdminController::class, 'update']);
        Route::post('/tags/{tag}/cover',           [TagAdminController::class, 'uploadCover']);
        Route::delete('/tags/{tag}/cover',         [TagAdminController::class, 'removeCover']);

        Route::get('/badges',                                       [BadgeAdminController::class, 'index']);
        Route::post('/users/{user}/badges',                         [BadgeAdminController::class, 'award']);
        Route::delete('/users/{user}/badges/{badgeSlug}',           [BadgeAdminController::class, 'revoke']);

        // Blog moderation
        Route::get('/blog/pending',              [BlogController::class, 'pending']);
        Route::post('/blog/{blog}/approve',      [BlogController::class, 'approve']);
        Route::post('/blog/{blog}/reject',       [BlogController::class, 'reject']);
    });

    // Admin-only (not moderators)
    Route::prefix('admin')->middleware(EnsureAdmin::class . ':admin')->group(function () {
        Route::patch('/users/{user}',  [UserAdminController::class, 'update']);
        Route::delete('/users/{user}', [UserAdminController::class, 'destroy']);
        Route::delete('/tags/{tag}',   [TagAdminController::class, 'destroy']);
    });
});
