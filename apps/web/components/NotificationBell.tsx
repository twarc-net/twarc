"use client";

import Link from "next/link";
import { useNotificationStream } from "@/lib/useNotificationStream";
import { useAuth } from "@/lib/auth-context";

/**
 * Bell icon with unread count badge. Uses the real-time SSE stream so the
 * count updates instantly when a notification arrives — no polling.
 */
export function NotificationBell() {
  const { user } = useAuth();
  const { unread, connected } = useNotificationStream(!!user);

  if (!user) return null;
  const count = unread ?? 0;

  return (
    <Link
      href="/notifications"
      className="relative size-8 grid place-items-center text-text-secondary hover:text-sakura transition-colors"
      aria-label={`Notifications ${count > 0 ? `(${count} unread)` : ""}`}
      title={count > 0 ? `${count} unread` : "Notifications"}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 grid place-items-center rounded-full bg-sakura text-bg-base text-[10px] font-mono font-bold border-2 border-bg-base">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
