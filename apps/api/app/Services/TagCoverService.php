<?php

namespace App\Services;

use App\Models\Post;
use App\Models\Tag;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

class TagCoverService
{
    private const ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    public function uploadCover(Tag $tag, UploadedFile $file): Tag
    {
        if (! in_array($file->getMimeType(), self::ACCEPTED_MIMES, true)) {
            abort(422, 'Unsupported image type.');
        }

        $sha256 = hash_file('sha256', $file->getRealPath());
        $a = substr($sha256, 0, 2);
        $b = substr($sha256, 2, 4);
        $relDir = "covers/{$a}/{$b}";

        Storage::disk('public')->makeDirectory($relDir);

        $manager = new ImageManager(new GdDriver());

        $variants = [
            'thumb' => 180,
            'card'  => 400,
            'hero'  => 1200,
        ];
        foreach ($variants as $name => $width) {
            $img = $manager->decodePath($file->getRealPath());
            $img->scaleDown(width: $width);
            $encoded = $img->encode(new WebpEncoder(quality: $name === 'hero' ? 88 : 84));
            Storage::disk('public')->put("{$relDir}/{$sha256}_{$name}.webp", (string) $encoded);
        }

        $tag->forceFill(['cover_sha256' => $sha256])->save();
        return $tag;
    }

    /**
     * Set a tag's cover by reusing an existing post's image bytes.
     * Reuses the post's sha256 as the cover sha so multiple tags sharing the same
     * cover image dedup on disk automatically.
     */
    public function setCoverFromPost(Tag $tag, Post $post): Tag
    {
        $sourcePath = storage_path('app/public/' . $post->storagePath('original'));
        if (! is_file($sourcePath)) {
            // fall back to the 850px preview if the original is missing
            $sourcePath = storage_path('app/public/' . $post->storagePath('preview'));
            if (! is_file($sourcePath)) {
                throw new \RuntimeException("source image for post {$post->id} not found");
            }
        }

        $sha = $post->sha256;
        $a = substr($sha, 0, 2);
        $b = substr($sha, 2, 4);
        $relDir = "covers/{$a}/{$b}";

        Storage::disk('public')->makeDirectory($relDir);
        $manager = new ImageManager(new GdDriver());

        foreach (['thumb' => 180, 'card' => 400, 'hero' => 1200] as $name => $width) {
            $target = "{$relDir}/{$sha}_{$name}.webp";
            // Skip if a previous tag already generated this size from the same post
            if (Storage::disk('public')->exists($target)) continue;
            $img = $manager->decodePath($sourcePath);
            $img->scaleDown(width: $width);
            $encoded = $img->encode(new WebpEncoder(quality: $name === 'hero' ? 88 : 84));
            Storage::disk('public')->put($target, (string) $encoded);
        }

        $tag->forceFill(['cover_sha256' => $sha])->save();
        return $tag;
    }

    public function removeCover(Tag $tag): void
    {
        if (! $tag->cover_sha256) return;
        $sha = $tag->cover_sha256;
        $a = substr($sha, 0, 2);
        $b = substr($sha, 2, 4);
        foreach (['thumb', 'card', 'hero'] as $v) {
            Storage::disk('public')->delete("covers/{$a}/{$b}/{$sha}_{$v}.webp");
        }
        $tag->forceFill(['cover_sha256' => null])->save();
    }
}
