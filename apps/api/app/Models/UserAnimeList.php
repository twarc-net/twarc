<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAnimeList extends Model
{
    protected $guarded = [];

    public const STATUSES = ['watching', 'planning', 'completed', 'on_hold', 'dropped'];

    protected function casts(): array
    {
        return [
            'is_favorite' => 'bool',
            'started_at'  => 'date',
            'finished_at' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function animeTag(): BelongsTo
    {
        return $this->belongsTo(Tag::class, 'anime_tag_id');
    }
}
