<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AvatarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MeController extends Controller
{
    public function __construct(private readonly AvatarService $avatars) {}

    /** PATCH /api/me  body: { display_name?, bio?, show_questionable? } */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'display_name'      => ['sometimes', 'nullable', 'string', 'max:80'],
            'bio'               => ['sometimes', 'nullable', 'string', 'max:500'],
            'show_questionable' => ['sometimes', 'boolean'],
            'birthdate'         => ['sometimes', 'nullable', 'date', 'before:today'],
        ]);

        // If user is trying to enable show_questionable, require a birthdate that proves 18+
        if (isset($data['show_questionable']) && $data['show_questionable'] === true) {
            $birthdate = $data['birthdate'] ?? $request->user()->birthdate;
            if (! $birthdate || \Carbon\Carbon::parse($birthdate)->age < 18) {
                return response()->json([
                    'message' => 'Birthdate confirming you are 18+ is required to view questionable content.',
                    'errors' => ['birthdate' => ['Must be a date showing you are at least 18.']],
                ], 422);
            }
        }

        $request->user()->fill($data)->save();

        return response()->json([
            'user' => $this->meTransform($request->user()->fresh()),
        ]);
    }

    /** POST /api/me/avatar  multipart: image */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate(['image' => ['required', 'file', 'image', 'max:5120']]); // 5MB

        $this->avatars->upload($request->user(), $request->file('image'));

        return response()->json([
            'user' => $this->meTransform($request->user()->fresh()),
        ]);
    }

    /** DELETE /api/me/avatar */
    public function removeAvatar(Request $request): JsonResponse
    {
        $this->avatars->remove($request->user());

        return response()->json([
            'user' => $this->meTransform($request->user()->fresh()),
        ]);
    }

    private function meTransform($u): array
    {
        return [
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
        ];
    }
}
