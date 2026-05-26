<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['post_id', 'editor_id', 'tag_string', 'rating', 'source_url', 'description', 'reason'])]
class PostVersion extends Model
{
    public $timestamps = false;
    protected $table = 'post_versions';

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'editor_id');
    }
}
