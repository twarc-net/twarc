<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['antecedent_name', 'consequent_id', 'created_by'])]
class TagAlias extends Model
{
    public $timestamps = false;
    protected $table = 'tag_aliases';

    public function consequent(): BelongsTo
    {
        return $this->belongsTo(Tag::class, 'consequent_id');
    }
}
