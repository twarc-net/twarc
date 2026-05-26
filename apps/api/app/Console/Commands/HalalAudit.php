<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Services\HalalGuard;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Audit posts against the halal blocklist.
 *
 *   php artisan waifu:halal-audit                 # report only, no changes
 *   php artisan waifu:halal-audit --execute       # soft-delete matching posts
 *   php artisan waifu:halal-audit --execute --hard  # also remove image files from disk
 */
class HalalAudit extends Command
{
    protected $signature = 'waifu:halal-audit
        {--execute : actually soft-delete matching posts (default is dry-run)}
        {--hard    : when used with --execute, also remove image files from disk}';

    protected $description = 'Find and remove posts that violate the halal content policy';

    public function handle(HalalGuard $guard): int
    {
        $blockedIds = $guard->blockedTagIds();
        $this->info("Halal blocklist resolves to " . count($blockedIds) . " known tag IDs in our DB.");

        if (empty($blockedIds)) {
            $this->warn("No blocked tags exist in the DB. Nothing to do.");
            return self::SUCCESS;
        }

        // Find posts whose tag_ids overlap with the blocklist
        $offending = Post::query()
            ->whereRaw('tag_ids && ?::bigint[]', ['{' . implode(',', $blockedIds) . '}'])
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->get(['id', 'sha256', 'ext', 'tag_string']);

        $total = $offending->count();
        $active = Post::where('status', 'active')->whereNull('deleted_at')->count();

        $this->info('');
        $this->info(sprintf(
            "Of %d active posts, %d (%d%%) violate the halal policy.",
            $active, $total, $active > 0 ? round($total / $active * 100) : 0
        ));

        if ($total === 0) return self::SUCCESS;

        // Show a sample so the operator can sanity-check
        $this->info('');
        $this->info('=== sample (first 10) ===');
        foreach ($offending->take(10) as $p) {
            $bad = $guard->offendingTags($p->tag_string);
            $this->line(sprintf('  #%-6d  bad: [%s]', $p->id, implode(' ', array_slice($bad, 0, 6))));
        }

        if (! $this->option('execute')) {
            $this->info('');
            $this->info('Dry-run only. Re-run with --execute to soft-delete these posts.');
            $this->info('Add --hard to also remove image files from disk.');
            return self::SUCCESS;
        }

        $this->info('');
        $this->info('Soft-deleting…');
        $bar = $this->output->createProgressBar($total);
        $bar->start();
        $deleted = 0;

        $hard = $this->option('hard');
        $publicDisk = \Storage::disk('public');

        foreach ($offending as $p) {
            try {
                $p->delete(); // soft

                if ($hard) {
                    $a = substr($p->sha256, 0, 2);
                    $b = substr($p->sha256, 2, 4);
                    foreach (['original' => $p->ext, 'preview' => 'webp', 'sample' => 'webp', 'thumb' => 'webp'] as $variant => $ext) {
                        $suffix = $variant === 'original' ? "{$p->sha256}.{$p->ext}" : "{$p->sha256}_{$variant}.webp";
                        $publicDisk->delete("posts/{$a}/{$b}/{$suffix}");
                    }
                }
                $deleted++;
            } catch (\Throwable $e) {
                $this->newLine();
                $this->error("  #{$p->id}: " . substr($e->getMessage(), 0, 100));
            }
            $bar->advance();
        }
        $bar->finish();
        $this->newLine(2);

        // Reconcile tag.post_count
        $this->info('Reconciling tag.post_count…');
        DB::statement("
            UPDATE tags SET post_count = (
                SELECT COUNT(*) FROM posts
                WHERE tags.id = ANY(posts.tag_ids)
                  AND posts.status = 'active'
                  AND posts.deleted_at IS NULL
            )
        ");

        $this->info("Done. Soft-deleted {$deleted} posts." . ($hard ? ' Image files removed.' : ''));
        $this->info('');
        $this->info("Now active: " . Post::where('status', 'active')->whereNull('deleted_at')->count() . " posts.");
        return self::SUCCESS;
    }
}
