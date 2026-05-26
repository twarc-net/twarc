<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['slug', 'name', 'icon', 'color', 'description', 'is_auto', 'sort_order'])]
class Badge extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return ['is_auto' => 'boolean'];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_badges')
            ->withPivot(['awarded_at', 'awarded_by']);
    }
}
