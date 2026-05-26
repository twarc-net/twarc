"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { notifications, type Notification } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await notifications.list();
      setItems(r.data);
      setUnread(r.meta.unread_count);
    } catch { setItems([]); }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    load();
  }, [loading, user, router, load]);

  const markAllRead = async () => {
    await notifications.markRead(undefined, true);
    setUnread(0);
    setItems((prev) => prev?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? null);
  };

  if (!user) return null;

  return (
    <main className="flex-1 mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight">
          notifications
          {unread > 0 && <span className="text-sakura text-base font-mono ml-3">{unread} unread</span>}
        </h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm font-mono text-text-muted hover:text-sakura transition-colors">
            mark all read
          </button>
        )}
      </div>

      {items === null ? (
        <div className="text-text-muted font-mono text-sm">loading…</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border-strong p-10 text-center text-text-muted">
          nothing here yet — follow some artists and they&apos;ll show up
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => <Row key={n.id} n={n} />)}
        </div>
      )}
    </main>
  );
}

function Row({ n }: { n: Notification }) {
  const unread = !n.read_at;
  const d = n.data as Record<string, string | number>;

  let body: React.ReactNode = null;
  let href: string = "/notifications";

  if (n.type === "follow") {
    body = <>
      <Link href={`/u/${d.follower_username}`} className="text-sakura hover:underline">
        @{d.follower_username}
      </Link>
      <span className="text-text-secondary"> started following you</span>
    </>;
    href = `/u/${d.follower_username}`;
  } else if (n.type === "reply") {
    body = <>
      <Link href={`/u/${d.replier_username}`} className="text-sakura hover:underline">
        @{d.replier_username}
      </Link>
      <span className="text-text-secondary"> replied to your comment</span>
      {d.preview && <span className="text-text-muted text-xs block mt-0.5 italic">&ldquo;{String(d.preview)}&rdquo;</span>}
    </>;
    href = `/post/${d.post_id}#comment-${d.comment_id}`;
  } else if (n.type === "mention") {
    body = <>
      <Link href={`/u/${d.mentioner_username}`} className="text-sakura hover:underline">
        @{d.mentioner_username}
      </Link>
      <span className="text-text-secondary"> mentioned you</span>
      {d.preview && <span className="text-text-muted text-xs block mt-0.5 italic">&ldquo;{String(d.preview)}&rdquo;</span>}
    </>;
    href = `/post/${d.post_id}#comment-${d.comment_id}`;
  } else if (n.type === "badge_awarded") {
    body = <>
      <span className="text-text-secondary">You were awarded the </span>
      <span className="text-cyber font-mono">{d.badge_icon} {d.badge_name}</span>
      <span className="text-text-secondary"> badge</span>
    </>;
  } else {
    body = <span className="text-text-secondary font-mono text-xs">{n.type}</span>;
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-3 border transition-colors ${
        unread ? "border-sakura/40 bg-sakura/5" : "border-border-subtle bg-bg-surface hover:border-border-strong"
      }`}
    >
      {unread && <span className="size-2 rounded-full bg-sakura shrink-0" />}
      <div className="flex-1 min-w-0 text-sm">
        {body}
      </div>
      <span className="text-xs font-mono text-text-muted shrink-0">
        {timeAgo(n.created_at)}
      </span>
    </Link>
  );
}
