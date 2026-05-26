"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Subscribe to the SSE notification stream at /api/me/notifications/stream.
 *
 * Uses the browser-native EventSource. The browser will automatically reconnect
 * on network blips and resume from `Last-Event-ID`, so we don't need to
 * implement our own retry/backoff loop.
 *
 * Returns the latest unread count plus the most recent notification payload
 * received this session — callers can pop a toast on change.
 *
 * The hook only opens a connection when the page is visible; when the tab is
 * hidden we close the EventSource to save resources, and reopen on visibilitychange.
 */
export type NotificationEvent = {
  id: number;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export function useNotificationStream(enabled = true) {
  const [unread, setUnread] = useState<number | null>(null);
  const [latest, setLatest] = useState<NotificationEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof EventSource === "undefined") return;

    let cancelled = false;

    const open = () => {
      if (cancelled) return;
      if (esRef.current) return;
      const url = "/api/me/notifications/stream";
      // withCredentials sends our Sanctum session cookie so the stream auths.
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.addEventListener("connected", (ev) => {
        try {
          const d = JSON.parse((ev as MessageEvent).data);
          if (typeof d?.unread_count === "number") setUnread(d.unread_count);
          setConnected(true);
        } catch { /* ignore */ }
      });

      es.addEventListener("notification", (ev) => {
        try {
          const d = JSON.parse((ev as MessageEvent).data) as NotificationEvent;
          setLatest(d);
        } catch { /* ignore */ }
      });

      es.addEventListener("unread_count", (ev) => {
        try {
          const d = JSON.parse((ev as MessageEvent).data);
          if (typeof d?.count === "number") setUnread(d.count);
        } catch { /* ignore */ }
      });

      es.onerror = () => {
        setConnected(false);
        // Browser auto-reconnects; we don't need to close. But if it loops,
        // back off to once-per-15s after a few errors.
      };
    };

    const close = () => {
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
    };

    const onVisChange = () => {
      if (document.visibilityState === "visible") open();
      else close();
    };

    open();
    document.addEventListener("visibilitychange", onVisChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisChange);
      close();
    };
  }, [enabled]);

  return { unread, latest, connected };
}
