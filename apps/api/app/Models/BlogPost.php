<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class BlogPost extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'author_id', 'slug', 'title', 'excerpt', 'body', 'cover_url',
        'status', 'published_at',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /** Make a URL-safe slug from a title. */
    public static function slugFromTitle(string $title): string
    {
        $base = Str::slug(Str::limit(strtolower($title), 60, ''));
        if ($base === '') $base = 'post';
        $candidate = $base;
        $n = 2;
        while (self::withTrashed()->where('slug', $candidate)->exists()) {
            $candidate = "{$base}-{$n}";
            $n++;
            if ($n > 50) { $candidate = "{$base}-" . Str::random(6); break; }
        }
        return $candidate;
    }

    /** Auto-generate an excerpt from the markdown body when none provided. */
    protected function autoExcerpt(): Attribute
    {
        return Attribute::get(function (): string {
            $text = strip_tags($this->body ?? '');
            $text = preg_replace('/\s+/', ' ', $text);
            return Str::limit(trim($text), 200);
        });
    }
}
