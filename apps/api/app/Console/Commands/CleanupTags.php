<?php

namespace App\Console\Commands;

use App\Models\Tag;
use App\Services\TagCoverService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Delete tags that have no active posts. Reconciles post_count from
 * the actual posts table first, then removes orphans.
 *
 * Locked tags are never deleted (safety).
 *
 *   php artisan waifu:cleanup-tags                       # delete unused anime + character tags
 *   php artisan waifu:cleanup-tags --dry-run             # preview only
 *   php artisan waifu:cleanup-tags --categories=copyright,character,general
 */
class CleanupTags extends Command
{
    protected $signature = 'waifu:cleanup-tags
        {--categories=copyright,character : tag categories to clean}
        {--dry-run : show what would be deleted without changing anything}';

    protected $description = 'Reconcile post_count and remove tags with zero posts';

    public function handle(TagCoverService $service): int
    {
        $cats = collect(explode(',', $this->option('categories')))->map(fn ($c) => trim($c))->all();
        $dryRun = (bool) $this->option('dry-run');

        $this->info('1. Reconciling post_count from actual post tag_ids…');
        DB::statement("
            UPDATE tags SET post_count = (
                SELECT COUNT(*) FROM posts
                WHERE tags.id = ANY(posts.tag_ids)
                  AND posts.status = 'active'
                  AND posts.deleted_at IS NULL
            )
        ");
        $this->info('   done.');

        $stale = Tag::query()
            ->whereIn('category', $cats)
            ->where('post_count', 0)
            ->where('is_locked', false)
            ->orderBy('category')->orderBy('name')
            ->get();

        if ($stale->isEmpty()) {
            $this->info('No stale tags to delete.');
            return self::SUCCESS;
        }

        $this->info('');
        $this->info(($dryRun ? '[DRY RUN] Would delete' : 'Deleting') . " {$stale->count()} tags:");
        foreach ($stale as $t) {
            $this->line("  - {$t->category}/{$t->name}" . ($t->cover_sha256 ? "  (had cover)" : ''));
        }

        if ($dryRun) {
            $this->info('');
            $this->info('Re-run without --dry-run to actually delete.');
            return self::SUCCESS;
        }

        $errors = 0;
        DB::transaction(function () use ($stale, $service, &$errors) {
            foreach ($stale as $t) {
                try {
                    DB::table('tag_aliases')->where('consequent_id', $t->id)->delete();
                    DB::table('tag_implications')->where('antecedent_id', $t->id)->orWhere('consequent_id', $t->id)->delete();
                    if ($t->cover_sha256) {
                        // Best-effort cover file cleanup (skip on error so deletion proceeds)
                        try { $service->removeCover($t); } catch (\Throwable) {}
                    }
                    $t->delete();
                } catch (\Throwable $e) {
                    $errors++;
                    $this->newLine();
                    $this->error("  ! {$t->name}: " . substr($e->getMessage(), 0, 100));
                }
            }
        });

        $this->info('');
        $this->info("Deleted {$stale->count()} tags" . ($errors ? " ({$errors} errors)" : '') . '.');
        return self::SUCCESS;
    }
}
