<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['user_id', 'name', 'slug', 'is_public', 'description', 'cover_post_id'])]
class Collection extends Model
{
    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cover(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'cover_post_id');
    }

    public function posts(): BelongsToMany
    {
        return $this->belongsToMany(Post::class, 'collection_posts')
            ->withPivot(['position', 'added_at'])
            ->orderBy('collection_posts.position');
    }
}
