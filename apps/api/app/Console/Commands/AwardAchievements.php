<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\AchievementService;
use Illuminate\Console\Command;

/**
 * Nightly: re-evaluate every auto-criteria badge for every user.
 * Runs cheaply since AchievementService skips already-earned badges.
 *
 *   php artisan waifu:award-achievements             # all users
 *   php artisan waifu:award-achievements --user=42   # one user
 */
class AwardAchievements extends Command
{
    protected $signature = 'waifu:award-achievements {--user= : limit to a single user id or username}';
    protected $description = 'Award newly-eligible auto-criteria achievement badges';

    public function handle(AchievementService $svc): int
    {
        $query = User::query();
        if ($u = $this->option('user')) {
            if (is_numeric($u)) $query->where('id', (int) $u);
            else                $query->where('username', $u);
        }

        $totalAwarded = 0;
        $touched      = 0;

        $query->orderBy('id')->chunkById(200, function ($users) use ($svc, &$totalAwarded, &$touched) {
            foreach ($users as $u) {
                $awarded = $svc->evaluateUser($u);
                if (! empty($awarded)) {
                    $this->line("  @{$u->username}: " . implode(', ', $awarded));
                    $totalAwarded += count($awarded);
                }
                $touched++;
            }
        });

        $this->info("Evaluated {$touched} users · awarded {$totalAwarded} new badges.");
        return self::SUCCESS;
    }
}
