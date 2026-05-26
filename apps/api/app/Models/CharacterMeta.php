<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CharacterMeta extends Model
{
    protected $table = 'character_meta';
    protected $primaryKey = 'tag_id';
    public $incrementing = false;
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'imported_at' => 'datetime',
        ];
    }

    public function tag(): BelongsTo
    {
        return $this->belongsTo(Tag::class, 'tag_id');
    }

    /** Anime this character appears in. */
    public function animes(): BelongsToMany
    {
        return $this->belongsToMany(
            Tag::class,
            'anime_characters',
            'character_tag_id',
            'anime_tag_id',
            'tag_id',
            'id',
        )->withPivot('role', 'favorites');
    }
}
