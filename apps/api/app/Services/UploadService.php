<?php

namespace App\Services;

use App\Models\Post;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Encoders\WebpEncoder;

class UploadService
{
    private const ACCEPTED_MIMES = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];

    public function __construct(
        private readonly TagService $tags,
        private readonly HalalGuard $halal,
    ) {}

    /**
     * Process an upload: dedupe by sha256, write original + variants, create post row.
     *
     * @param  array<string,string>  $tagsByCategory  e.g. ['copyright' => 'chainsaw_man', 'character' => 'denji', 'general' => 'red_eyes']
     * @return array{post: Post, was_dedupe: bool}
     */
    public function handle(
        UploadedFile $file,
        User $uploader,
        array $tagsByCategory,
        string $rating = 'safe',
        ?string $title = null,
        ?string $description = null,
        ?string $sourceUrl = null,
    ): array {
        // 1. Validate mime
        $mime = $file->getMimeType();
        if (! isset(self::ACCEPTED_MIMES[$mime])) {
            abort(422, "Unsupported file type: {$mime}");
        }
        $ext = self::ACCEPTED_MIMES[$mime];

        // 2. Compute hashes
        $sha256 = hash_file('sha256', $file->getRealPath());
        $md5    = hash_file('md5', $file->getRealPath());

        // 3. Dedupe check
        $existing = Post::where('sha256', $sha256)->first();
        if ($existing) {
            return ['post' => $existing, 'was_dedupe' => true];
        }

        // 4. Dimensions
        [$width, $height] = getimagesize($file->getRealPath());

        // 5. Build storage path: posts/ab/cd/<sha>.<ext>
        $a = substr($sha256, 0, 2);
        $b = substr($sha256, 2, 4);
        $relDir = "posts/{$a}/{$b}";
        $relOrig = "{$relDir}/{$sha256}.{$ext}";

        Storage::disk('public')->makeDirectory($relDir);
        Storage::disk('public')->put($relOrig, file_get_contents($file->getRealPath()));

        // 6. Generate variants (sample/preview/thumb) — Intervention\Image v4 / libgd
        $manager = new ImageManager(new GdDriver());

        $mkVariant = function (int $width, int $quality) use ($manager, $file) {
            $img = $manager->decodePath($file->getRealPath());
            $img->scaleDown(width: $width);
            return $img->encode(new WebpEncoder(quality: $quality));
        };

        Storage::disk('public')->put("{$relDir}/{$sha256}_180.webp",     (string) $mkVariant(180, 82));
        Storage::disk('public')->put("{$relDir}/{$sha256}_sample.webp",  (string) $mkVariant(360, 82));
        Storage::disk('public')->put("{$relDir}/{$sha256}_preview.webp", (string) $mkVariant(850, 85));

        // 7. Normalize tags — accept category-hinted multi-input
        $tagData = $this->tags->mergeCategoryTags($tagsByCategory);

        // 7b. Halal policy — reject if any tag is on the blocklist.
        $offending = $this->halal->offendingTags($tagData['tag_string']);
        if (! empty($offending)) {
            abort(422, 'This upload contains tags that are not permitted on twarc: ' . implode(', ', array_slice($offending, 0, 5)));
        }

        // 8. Rating is always 'safe' — twarc is a halal-only gallery.
        $rating = 'safe';

        // 9. Insert post (status=pending so mods can review the first uploads)
        $post = Post::create([
            'uploader_id' => $uploader->id,
            'sha256'      => $sha256,
            'md5'         => $md5,
            'ext'         => $ext,
            'mime'        => $mime,
            'width'       => $width,
            'height'      => $height,
            'file_size'   => $file->getSize(),
            'rating'      => $rating,
            'status'      => $uploader->isModerator() ? 'active' : 'pending',
            'source_url'  => $sourceUrl,
            'title'       => $title,
            'description' => $description,
            'tag_string'  => $tagData['tag_string'],
            'tag_ids'     => '{' . implode(',', $tagData['tag_ids']) . '}',
            'tag_count'   => $tagData['tag_count'],
        ]);

        // Update tag post_counts asynchronously? Just inline for now.
        $this->tags->recountTags($tagData['tag_ids']);

        return ['post' => $post, 'was_dedupe' => false];
    }
}
