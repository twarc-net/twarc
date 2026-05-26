<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FavoriteController extends Controller
{
    public function store(Request $request, Post $post): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($user, $post) {
            $inserted = DB::table('post_favorites')->insertOrIgnore([
                'user_id'    => $user->id,
                'post_id'    => $post->id,
                'created_at' => now(),
            ]);
            if ($inserted) {
                DB::table('posts')->where('id', $post->id)->increment('fav_count');
            }
        });

        return response()->json([
            'favorited' => true,
            'fav_count' => $post->fresh()->fav_count,
        ]);
    }

    public function destroy(Request $request, Post $post): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($user, $post) {
            $removed = DB::table('post_favorites')
                ->where('user_id', $user->id)
                ->where('post_id', $post->id)
                ->delete();
            if ($removed) {
                DB::table('posts')->where('id', $post->id)->decrement('fav_count');
            }
        });

        return response()->json([
            'favorited' => false,
            'fav_count' => $post->fresh()->fav_count,
        ]);
    }
}
