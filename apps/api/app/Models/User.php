<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * NOTE: `role` is intentionally NOT in Fillable.
 *   Role changes go through UserAdminController which uses explicit `update(['role' => ...])`.
 *   This prevents mass-assignment escalation if ANY endpoint ever does User::fill($request->all()).
 */
#[Fillable([
    'username', 'email', 'password',
    'display_name', 'bio', 'avatar_sha256',
    'show_questionable', 'birthdate',
])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'birthdate'         => 'date',
            'show_questionable' => 'boolean',
            'password'          => 'hashed',
        ];
    }

    // ---------- Relations ----------

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'uploader_id');
    }

    public function favorites(): BelongsToMany
    {
        return $this->belongsToMany(Post::class, 'post_favorites');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function collections(): HasMany
    {
        return $this->hasMany(Collection::class);
    }

    public function following(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'follows', 'follower_id', 'followee_id')
            ->withTimestamps();
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'follows', 'followee_id', 'follower_id')
            ->withTimestamps();
    }

    public function badges(): BelongsToMany
    {
        return $this->belongsToMany(Badge::class, 'user_badges')
            ->withPivot(['awarded_at', 'awarded_by'])
            ->orderBy('badges.sort_order');
    }

    // ---------- Helpers ----------

    public function isOver18(): bool
    {
        return $this->birthdate !== null
            && $this->birthdate->diffInYears(now()) >= 18;
    }

    public function isModerator(): bool
    {
        return in_array($this->role, ['moderator', 'admin'], true);
    }

    /**
     * Public URL for the user's avatar variant. Returns null if no avatar.
     */
    public function avatarUrl(string $variant = 'thumb'): ?string
    {
        if (! $this->avatar_sha256) return null;
        $a = substr($this->avatar_sha256, 0, 2);
        $b = substr($this->avatar_sha256, 2, 4);
        $cdn = rtrim(config('app.cdn_url') ?? '/storage', '/');
        $suffix = match ($variant) {
            'thumb' => '_thumb.webp',
            'card'  => '_card.webp',
            default => throw new \InvalidArgumentException("Unknown avatar variant: $variant"),
        };
        return "{$cdn}/avatars/{$a}/{$b}/{$this->avatar_sha256}{$suffix}";
    }
}
