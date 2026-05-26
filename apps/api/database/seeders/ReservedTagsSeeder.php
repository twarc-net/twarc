<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ReservedTagsSeeder extends Seeder
{
    public function run(): void
    {
        $reserved = [
            ['name' => 'ai_generated',      'category' => 'meta',      'is_locked' => true],
            ['name' => 'sketch',            'category' => 'meta',      'is_locked' => true],
            ['name' => 'wip',               'category' => 'meta',      'is_locked' => true],
            ['name' => 'commission',        'category' => 'meta',      'is_locked' => true],
            ['name' => 'original_character','category' => 'meta',      'is_locked' => true],
            ['name' => 'fanart',            'category' => 'meta',      'is_locked' => true],
            ['name' => 'screencap',         'category' => 'meta',      'is_locked' => true],
            ['name' => 'official_art',      'category' => 'meta',      'is_locked' => true],
        ];

        foreach ($reserved as $tag) {
            DB::statement(
                "INSERT INTO tags (name, category, is_locked) VALUES (?, ?::tag_category, ?)
                 ON CONFLICT (name) DO NOTHING",
                [$tag['name'], $tag['category'], $tag['is_locked']]
            );
        }

        $this->command->info('Seeded ' . count($reserved) . ' reserved meta tags.');
    }
}
