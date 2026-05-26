<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Badge;
use App\Models\ModAction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BadgeAdminController extends Controller
{
    /** GET /api/admin/badges — all badges */
    public function index(): JsonResponse
    {
        $badges = Badge::orderBy('sort_order')->get();
        return response()->json(['data' => $badges]);
    }

    /** POST /api/admin/users/{user}/badges  body: {badge_slug} */
    public function award(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'badge_slug' => ['required', 'string', 'exists:badges,slug'],
        ]);

        $badge = Badge::where('slug', $data['badge_slug'])->firstOrFail();

        $inserted = DB::table('user_badges')->insertOrIgnore([
            'user_id'    => $user->id,
            'badge_id'   => $badge->id,
            'awarded_at' => now(),
            'awarded_by' => $request->user()->id,
        ]);

        if ($inserted) {
            ModAction::create([
                'mod_id'      => $request->user()->id,
                'target_type' => 'user',
                'target_id'   => $user->id,
                'action'      => 'badge_award',
                'reason'      => $badge->slug,
            ]);
            // Notify the user
            DB::table('notifications')->insert([
                'user_id' => $user->id,
                'type'    => 'badge_awarded',
                'data'    => json_encode([
                    'badge_slug' => $badge->slug,
                    'badge_name' => $badge->name,
                    'badge_icon' => $badge->icon,
                ]),
                'created_at' => now(),
            ]);

            // Sync denormalized is_verified flag
            if ($badge->slug === 'verified_creator') {
                $user->forceFill(['is_verified' => true])->save();
            }
        }

        return response()->json(['awarded' => (bool) $inserted, 'badge' => $badge]);
    }

    /** DELETE /api/admin/users/{user}/badges/{badgeSlug} */
    public function revoke(Request $request, User $user, string $badgeSlug): JsonResponse
    {
        $badge = Badge::where('slug', $badgeSlug)->firstOrFail();

        DB::table('user_badges')
            ->where('user_id', $user->id)
            ->where('badge_id', $badge->id)
            ->delete();

        ModAction::create([
            'mod_id'      => $request->user()->id,
            'target_type' => 'user',
            'target_id'   => $user->id,
            'action'      => 'badge_revoke',
            'reason'      => $badge->slug,
        ]);

        // Sync denormalized is_verified flag
        if ($badge->slug === 'verified_creator') {
            $user->forceFill(['is_verified' => false])->save();
        }

        return response()->json(['revoked' => true, 'badge' => $badge]);
    }
}
