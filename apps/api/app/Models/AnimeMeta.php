<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AnimeMeta extends Model
{
    protected $table = 'anime_meta';
    protected $primaryKey = 'tag_id';
    public $incrementing = false;
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'title_synonyms'  => 'array',
            'genres'          => 'array',
            'themes'          => 'array',
            'demographics'    => 'array',
            'streaming_links' => 'array',
            'aired_from'      => 'date',
            'aired_to'        => 'date',
            'score'           => 'float',
            'is_halal'        => 'bool',
            'imported_at'     => 'datetime',
        ];
    }

    public function tag(): BelongsTo
    {
        return $this->belongsTo(Tag::class, 'tag_id');
    }

    /** Character tags linked to this anime via the pivot. */
    public function characters(): BelongsToMany
    {
        return $this->belongsToMany(
            Tag::class,
            'anime_characters',
            'anime_tag_id',
            'character_tag_id',
            'tag_id',
            'id',
        )->withPivot('role', 'favorites');
    }
}
