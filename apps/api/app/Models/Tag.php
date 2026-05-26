<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'category', 'is_locked', 'description'])]
class Tag extends Model
{
    protected function casts(): array
    {
        return [
            'is_locked'  => 'boolean',
            'post_count' => 'integer',
            'view_count' => 'integer',
            'fav_total'  => 'integer',
        ];
    }

    public function aliases(): HasMany
    {
        return $this->hasMany(TagAlias::class, 'consequent_id');
    }

    public function implies(): HasMany
    {
        return $this->hasMany(TagImplication::class, 'antecedent_id');
    }

    /**
     * URL for the tag's cover image (anime poster, character portrait, etc.).
     * Returns null if no cover uploaded.
     */
    public function coverUrl(string $variant = 'card'): ?string
    {
        if (! $this->cover_sha256) return null;
        $a = substr($this->cover_sha256, 0, 2);
        $b = substr($this->cover_sha256, 2, 4);
        $cdn = rtrim(config('app.cdn_url') ?? '/storage', '/');
        $suffix = match ($variant) {
            'card'  => '_card.webp',   // 400 wide — for grid cards
            'thumb' => '_thumb.webp',  // 180 wide — small avatar
            'hero'  => '_hero.webp',   // 1200 wide — page banner
            default => throw new \InvalidArgumentException("Unknown variant: $variant"),
        };
        return "{$cdn}/covers/{$a}/{$b}/{$this->cover_sha256}{$suffix}";
    }

    /**
     * URL slug for the public detail page.
     *   - category=copyright → /anime/<name>
     *   - category=character → /character/<name>
     *   - else                 → /tag/<name>
     */
    public function publicPath(): string
    {
        return match ($this->category) {
            'copyright' => "/anime/{$this->name}",
            'character' => "/character/{$this->name}",
            default     => "/tag/{$this->name}",
        };
    }
}
