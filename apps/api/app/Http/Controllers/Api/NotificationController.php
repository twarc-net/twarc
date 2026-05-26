<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    /** GET /api/me/notifications */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $per  = min(60, max(10, (int) $request->query('per_page', 30)));

        $rows = DB::table('notifications')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit($per)
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($n) => [
                'id'         => $n->id,
                'type'       => $n->type,
                'data'       => json_decode($n->data, true),
                'read_at'    => $n->read_at,
                'created_at' => $n->created_at,
            ])->all(),
            'meta' => [
                'unread_count' => DB::table('notifications')
                    ->where('user_id', $user->id)
                    ->whereNull('read_at')
                    ->count(),
            ],
        ]);
    }

    /** GET /api/me/notifications/unread-count */
    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'count' => DB::table('notifications')
                ->where('user_id', $request->user()->id)
                ->whereNull('read_at')
                ->count(),
        ]);
    }

    /** POST /api/me/notifications/read  body: {ids?: [], all?: bool} */
    public function markRead(Request $request): JsonResponse
    {
        $request->validate([
            'ids'  => ['nullable', 'array'],
            'ids.*'=> ['integer'],
            'all'  => ['nullable', 'boolean'],
        ]);

        $q = DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at');

        if ($request->boolean('all')) {
            $updated = $q->update(['read_at' => now()]);
        } elseif ($ids = $request->input('ids', [])) {
            $updated = $q->whereIn('id', $ids)->update(['read_at' => now()]);
        } else {
            return response()->json(['message' => 'pass ids[] or all=true'], 422);
        }

        return response()->json(['marked' => $updated]);
    }
}
