<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'uploader_id', 'sha256', 'md5', 'perceptual_hash',
    'ext', 'mime', 'width', 'height', 'file_size',
    'rating', 'status', 'source_url', 'parent_id',
    'title', 'description',
    'tag_string', 'tag_ids', 'tag_count',
])]
class Post extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        // tag_ids is a PG bigint[] — keep as raw string here, parse only when needed.
        // Writes pass the PG literal '{1,2,3}' as-is from UploadService/TagService.
        return [
            'tag_count' => 'integer',
            'width'     => 'integer',
            'height'    => 'integer',
            'file_size' => 'integer',
        ];
    }

    // ---------- Relations ----------

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploader_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->whereNull('deleted_at');
    }

    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'post_favorites');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(PostVersion::class);
    }

    // ---------- URL helpers ----------

    /**
     * Content-addressed storage path: posts/ab/cd/<sha>.<ext>
     */
    public function storagePath(string $variant = 'original'): string
    {
        $a = substr($this->sha256, 0, 2);
        $b = substr($this->sha256, 2, 4);

        return match ($variant) {
            'original' => "posts/{$a}/{$b}/{$this->sha256}.{$this->ext}",
            'preview'  => "posts/{$a}/{$b}/{$this->sha256}_preview.webp",
            'sample'   => "posts/{$a}/{$b}/{$this->sha256}_sample.webp",
            'thumb'    => "posts/{$a}/{$b}/{$this->sha256}_180.webp",
            default    => throw new \InvalidArgumentException("Unknown variant: {$variant}"),
        };
    }

    public function publicUrl(string $variant = 'original'): string
    {
        // Dev: http://localhost:8000/storage/posts/ab/cd/<sha>.<ext>
        // Prod: https://cdn.<domain>/posts/ab/cd/<sha>.<ext>   (Bunny pull zone → B2)
        $cdn = rtrim(config('app.cdn_url') ?? '/storage', '/');
        return $cdn . '/' . $this->storagePath($variant);
    }
}
