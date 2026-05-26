<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next, string $minRole = 'moderator'): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $rank = ['member' => 0, 'contributor' => 1, 'moderator' => 2, 'admin' => 3];
        if (($rank[$user->role] ?? 0) < ($rank[$minRole] ?? 99)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return $next($request);
    }
}
