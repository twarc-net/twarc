<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

class AvatarService
{
    private const ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    public function upload(User $user, UploadedFile $file): User
    {
        if (! in_array($file->getMimeType(), self::ACCEPTED_MIMES, true)) {
            abort(422, 'Unsupported image type.');
        }

        $sha256 = hash_file('sha256', $file->getRealPath());
        $a = substr($sha256, 0, 2);
        $b = substr($sha256, 2, 4);
        $relDir = "avatars/{$a}/{$b}";

        Storage::disk('public')->makeDirectory($relDir);

        $manager = new ImageManager(new GdDriver());

        // Avatars are square. Crop center, generate 2 webp variants.
        foreach (['thumb' => 64, 'card' => 200] as $name => $size) {
            $img = $manager->decodePath($file->getRealPath());
            $img->coverDown(width: $size, height: $size);
            $encoded = $img->encode(new WebpEncoder(quality: 86));
            Storage::disk('public')->put("{$relDir}/{$sha256}_{$name}.webp", (string) $encoded);
        }

        $user->forceFill(['avatar_sha256' => $sha256])->save();
        return $user;
    }

    public function remove(User $user): void
    {
        if (! $user->avatar_sha256) return;
        $sha = $user->avatar_sha256;
        $a = substr($sha, 0, 2);
        $b = substr($sha, 2, 4);
        foreach (['thumb', 'card'] as $v) {
            Storage::disk('public')->delete("avatars/{$a}/{$b}/{$sha}_{$v}.webp");
        }
        $user->forceFill(['avatar_sha256' => null])->save();
    }
}
