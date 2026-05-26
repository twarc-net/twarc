<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\Tag;
use App\Services\TagCoverService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * For every anime + character tag that has posts but no cover, pick the
 * top-scored post using that tag and use its image as the cover.
 *
 *   php artisan waifu:auto-cover                 # cover all anime + character tags missing one
 *   php artisan waifu:auto-cover --overwrite     # replace even existing covers
 *   php artisan waifu:auto-cover --limit=50      # process first N
 */
class AutoCoverTags extends Command
{
    protected $signature = 'waifu:auto-cover
        {--categories=copyright,character : tag categories to cover (comma-separated)}
        {--overwrite : replace existing covers too}
        {--limit= : max number of tags to process}';

    protected $description = 'Auto-assign a cover image to anime + character tags from their best post';

    public function handle(TagCoverService $service): int
    {
        $cats = collect(explode(',', $this->option('categories')))->map(fn ($c) => trim($c))->all();

        $q = Tag::query()
            ->whereIn('category', $cats)
            ->where('post_count', '>', 0);

        if (! $this->option('overwrite')) $q->whereNull('cover_sha256');
        if ($limit = $this->option('limit')) $q->limit((int) $limit);

        $tags = $q->orderByDesc('post_count')->get();
        $this->info("Processing {$tags->count()} tags…");

        $covered = 0; $missing = 0; $errors = 0;
        $bar = $this->output->createProgressBar($tags->count());
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%%  %message%');
        $bar->setMessage('starting');
        $bar->start();

        foreach ($tags as $tag) {
            $bar->setMessage("→ {$tag->name}");

            // Pick the best post for this tag — top score, then favs, then dimensions
            $post = Post::query()
                ->whereRaw('? = ANY(tag_ids)', [$tag->id])
                ->where('status', 'active')
                ->whereNull('deleted_at')
                ->orderByDesc('score')
                ->orderByDesc('fav_count')
                ->orderByDesc(DB::raw('width * height'))
                ->first();

            if (! $post) { $missing++; $bar->advance(); continue; }

            try {
                $service->setCoverFromPost($tag, $post);
                $covered++;
            } catch (\Throwable $e) {
                $errors++;
                // Don't spam stderr — log shortly
                if ($errors < 5) {
                    $this->newLine();
                    $this->error("  {$tag->name}: " . substr($e->getMessage(), 0, 120));
                }
            }
            $bar->advance();
        }
        $bar->finish();
        $this->newLine(2);
        $this->info("Done. Covered: {$covered}  Missing source: {$missing}  Errors: {$errors}");
        return self::SUCCESS;
    }
}
