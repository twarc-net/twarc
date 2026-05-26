<?php

namespace App\Services;

use App\Models\Tag;
use App\Models\TagAlias;
use App\Models\TagImplication;
use Illuminate\Support\Facades\DB;

class TagService
{
    /**
     * Normalize a space-separated tag string:
     *   - splits and lowercases
     *   - resolves aliases (miku → hatsune_miku)
     *   - creates missing tags with $newTagCategory (default 'general')
     *   - expands implications transitively (hatsune_miku → vocaloid)
     *   - dedupes
     *
     * Returns: ['tag_ids' => int[], 'tag_string' => string, 'tag_count' => int]
     */
    public function normalize(string $rawTagString, string $newTagCategory = 'general'): array
    {
        return DB::transaction(function () use ($rawTagString, $newTagCategory) {
            $names = collect(preg_split('/\s+/', trim($rawTagString)))
                ->filter()
                ->map(fn ($n) => strtolower(trim($n)))
                ->filter(fn ($n) => preg_match('/^[a-z0-9_()\-]{1,100}$/', $n))
                ->unique()
                ->values();

            if ($names->isEmpty()) {
                return ['tag_ids' => [], 'tag_string' => '', 'tag_count' => 0];
            }

            // Resolve aliases — antecedent → consequent tag
            $aliasMap = TagAlias::whereIn('antecedent_name', $names)
                ->pluck('consequent_id', 'antecedent_name')
                ->toArray();

            // Get already-existing tags by name
            $existingTags = Tag::whereIn('name', $names)
                ->pluck('id', 'name')
                ->toArray();

            // Final tag IDs after alias resolution
            $finalTagIds = [];
            foreach ($names as $name) {
                if (isset($aliasMap[$name])) {
                    $finalTagIds[] = (int) $aliasMap[$name];
                } elseif (isset($existingTags[$name])) {
                    $finalTagIds[] = (int) $existingTags[$name];
                } else {
                    // Create with the requested category hint
                    $tag = Tag::create([
                        'name' => $name,
                        'category' => $newTagCategory,
                    ]);
                    $finalTagIds[] = $tag->id;
                }
            }

            // Expand implications transitively (BFS, max depth 8)
            $expanded = collect($finalTagIds)->unique()->values()->all();
            $frontier = $expanded;
            for ($depth = 0; $depth < 8 && ! empty($frontier); $depth++) {
                $implied = TagImplication::whereIn('antecedent_id', $frontier)
                    ->pluck('consequent_id')
                    ->map(fn ($id) => (int) $id)
                    ->unique()
                    ->all();

                $new = array_diff($implied, $expanded);
                if (empty($new)) {
                    break;
                }
                $expanded = array_merge($expanded, $new);
                $frontier = $new;
            }

            $finalIds = array_values(array_unique($expanded));

            // Build display string from final IDs (in canonical name order)
            $finalNames = Tag::whereIn('id', $finalIds)
                ->orderBy('name')
                ->pluck('name')
                ->all();

            return [
                'tag_ids'    => $finalIds,
                'tag_string' => implode(' ', $finalNames),
                'tag_count'  => count($finalIds),
            ];
        });
    }

    /**
     * Merge multiple category-hinted tag strings into one normalized set.
     *
     * Example:
     *   mergeCategoryTags([
     *     'copyright' => 'chainsaw_man',
     *     'character' => 'denji',
     *     'general'   => 'red_eyes school_uniform',
     *   ])
     *
     * Returns: ['tag_ids', 'tag_string', 'tag_count'] same shape as normalize().
     */
    public function mergeCategoryTags(array $byCategory): array
    {
        return DB::transaction(function () use ($byCategory) {
            $allIds = [];
            foreach ($byCategory as $category => $str) {
                if (! is_string($str) || trim($str) === '') continue;
                $r = $this->normalize($str, $category);
                $allIds = array_merge($allIds, $r['tag_ids']);
            }
            $finalIds = array_values(array_unique($allIds));

            $finalNames = empty($finalIds)
                ? []
                : \App\Models\Tag::whereIn('id', $finalIds)->orderBy('name')->pluck('name')->all();

            return [
                'tag_ids'    => $finalIds,
                'tag_string' => implode(' ', $finalNames),
                'tag_count'  => count($finalIds),
            ];
        });
    }

    /**
     * Recount post_count for a set of tag IDs after a post change.
     */
    public function recountTags(array $tagIds): void
    {
        foreach ($tagIds as $tagId) {
            DB::statement(
                "UPDATE tags SET post_count = (
                    SELECT COUNT(*) FROM posts
                    WHERE ? = ANY(tag_ids) AND status = 'active' AND deleted_at IS NULL
                ) WHERE id = ?",
                [$tagId, $tagId]
            );
        }
    }
}
