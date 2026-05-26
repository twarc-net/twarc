<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Server-Sent Events stream for real-time notifications.
 *
 * Browser opens an EventSource to /api/me/notifications/stream. We poll the
 * notifications table every $tickMs ms and push any new rows as SSE events.
 *
 * Compared to WebSockets / Mercure: this requires zero new infrastructure —
 * just the existing nginx → php-fpm stack with output buffering off for this
 * single route (see /etc/nginx/sites-available/twarc.net `location ~ /stream$`).
 *
 * Connection lifetime is capped at 25 minutes so a stale process doesn't leak;
 * the EventSource auto-reconnects, so the user experience is seamless.
 */
class NotificationStreamController extends Controller
{
    public function __invoke(Request $request): StreamedResponse
    {
        $user   = $request->user();
        if (! $user) abort(401);
        $userId = $user->id;

        // Resume from a client-provided "Last-Event-ID" header (per SSE spec)
        // so reconnects don't replay everything.
        $lastId = (int) ($request->header('Last-Event-ID') ?: $request->query('last_id', 0));

        $maxLifetimeSec  = 25 * 60;    // 25 minutes
        $tickMs          = 3500;       // 3.5 seconds between DB checks
        $heartbeatEveryS = 25;         // SSE comment heartbeat to keep proxies open

        $response = new StreamedResponse(function () use ($userId, &$lastId, $maxLifetimeSec, $tickMs, $heartbeatEveryS) {
            @set_time_limit($maxLifetimeSec + 30);
            @ignore_user_abort(false);

            // Tell nginx + php-fpm not to buffer this response.
            while (ob_get_level() > 0) ob_end_flush();

            $startedAt   = time();
            $lastBeatAt  = time();

            // On initial connect (no client-side Last-Event-ID), seed lastId
            // to the current MAX notification id for this user so we don't
            // replay history every time the page is refreshed. The bell badge
            // gets the live unread_count separately via the "connected" event;
            // notification cards only pop for genuinely NEW activity.
            //
            // EventSource auto-reconnect (after a network blip) DOES send
            // Last-Event-ID — so that path resumes correctly from where it
            // left off, no events lost.
            if ($lastId === 0) {
                $lastId = (int) DB::table('notifications')
                    ->where('user_id', $userId)
                    ->max('id') ?: 0;
            }

            // Initial "connected" event with the current unread count so the
            // client can sync state immediately without an extra HTTP hit.
            $unread = DB::table('notifications')->where('user_id', $userId)->whereNull('read_at')->count();
            echo "event: connected\ndata: " . json_encode(['unread_count' => $unread]) . "\n\n";
            @ob_flush(); @flush();

            while (! connection_aborted() && (time() - $startedAt) < $maxLifetimeSec) {
                // Poll for any notifications newer than $lastId.
                $q = DB::table('notifications')->where('user_id', $userId);
                if ($lastId > 0) $q->where('id', '>', $lastId);
                $rows = $q->orderBy('id')->limit(50)->get();

                foreach ($rows as $n) {
                    $payload = [
                        'id'         => $n->id,
                        'type'       => $n->type,
                        'data'       => json_decode($n->data, true),
                        'read_at'    => $n->read_at,
                        'created_at' => $n->created_at,
                    ];
                    echo "id: {$n->id}\n";
                    echo "event: notification\n";
                    echo "data: " . json_encode($payload) . "\n\n";
                    $lastId = (int) $n->id;
                }

                if (! empty($rows)) {
                    // Push fresh unread total so the bell badge stays correct.
                    $unread = DB::table('notifications')->where('user_id', $userId)->whereNull('read_at')->count();
                    echo "event: unread_count\ndata: " . json_encode(['count' => $unread]) . "\n\n";
                }

                // Heartbeat — comment line keeps Cloudflare / nginx / proxies open.
                if ((time() - $lastBeatAt) >= $heartbeatEveryS) {
                    echo ": heartbeat " . time() . "\n\n";
                    $lastBeatAt = time();
                }

                @ob_flush(); @flush();
                usleep($tickMs * 1000);
            }

            // Tell the client to wait longer before reconnecting if we exit cleanly.
            echo "retry: 2000\n\n";
            @ob_flush(); @flush();
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache, no-transform');
        $response->headers->set('X-Accel-Buffering', 'no'); // signals nginx to disable buffering
        $response->headers->set('Connection', 'keep-alive');

        return $response;
    }
}
