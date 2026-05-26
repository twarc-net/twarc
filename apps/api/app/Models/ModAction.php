<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['mod_id', 'target_type', 'target_id', 'action', 'reason', 'metadata'])]
class ModAction extends Model
{
    public $timestamps = false;
    protected $table = 'mod_actions';

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }
}
