<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TagController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $category = $request->query('category'); // general|artist|copyright|character|meta
        $sort     = $request->query('sort', 'count'); // count | name
        $per      = min(100, max(10, (int) $request->query('per_page', 50)));

        $q = Tag::query();
        if ($category && in_array($category, ['general', 'artist', 'copyright', 'character', 'meta'], true)) {
            $q->where('category', $category);
        }
        $q->orderBy($sort === 'name' ? 'name' : 'post_count', $sort === 'name' ? 'asc' : 'desc');

        $page = $q->paginate($per);

        return response()->json([
            'data' => array_map(fn ($t) => [
                'id'         => $t->id,
                'name'       => $t->name,
                'category'   => $t->category,
                'post_count' => $t->post_count,
            ], $page->items()),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function autocomplete(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 1) {
            return response()->json(['data' => []]);
        }

        $qb = Tag::query()
            ->where(function ($w) use ($q) {
                $w->whereRaw('name % ?', [$q])
                  ->orWhere('name', 'ILIKE', $q . '%');
            });

        if ($cat = $request->query('category')) {
            if (in_array($cat, ['general', 'artist', 'copyright', 'character', 'meta'], true)) {
                $qb->where('category', $cat);
            }
        }

        $rows = $qb
            ->orderByRaw('similarity(name, ?) DESC, post_count DESC', [$q])
            ->limit(15)
            ->get(['id', 'name', 'category', 'post_count']);

        return response()->json(['data' => $rows]);
    }
}
