<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['antecedent_id', 'consequent_id', 'created_by'])]
class TagImplication extends Model
{
    public $timestamps = false;
    protected $table = 'tag_implications';

    public function antecedent(): BelongsTo
    {
        return $this->belongsTo(Tag::class, 'antecedent_id');
    }

    public function consequent(): BelongsTo
    {
        return $this->belongsTo(Tag::class, 'consequent_id');
    }
}
