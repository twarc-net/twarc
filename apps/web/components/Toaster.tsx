"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useNotificationStream, type NotificationEvent } from "@/lib/useNotificationStream";

/**
 * In-app toast strip — top-right corner. Subscribes to the SSE notification
 * stream and pops a friendly card whenever the server pushes an event.
 *
 * Notification types we render:
 *   - badge_awarded   → "Achievement unlocked: {name}" (the dopamine moment)
 *   - post_approved   → "Your post is live →"
 *   - blog_published  → "Your blog post is live →"
 *   - follow          → "@user followed you"
 *   - mention         → "@user mentioned you in a comment"
 *   - reply           → "@user replied to your comment"
 *
 * Each toast auto-dismisses after 6 seconds; user can click to navigate or
 * close. Toasts stack from the top.
 */
type Toast = { key: string; ev: NotificationEvent };

const TOAST_TTL_MS = 6000;

export function Toaster() {
  const { latest } = useNotificationStream(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!latest) return;
    const key = `${latest.id}-${Date.now()}`;
    setToasts((prev) => [{ key, ev: latest }, ...prev].slice(0, 4));
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.key !== key));
    }, TOAST_TTL_MS);
    return () => clearTimeout(t);
  }, [latest]);

  const dismiss = (key: string) =>
    setToasts((prev) => prev.filter((t) => t.key !== key));

  return (
    <div className="fixed top-20 right-4 z-[120] flex flex-col gap-2 pointer-events-none w-[min(92vw,360px)]">
      {toasts.map((t) => (
        <ToastCard key={t.key} ev={t.ev} onClose={() => dismiss(t.key)} />
      ))}
    </div>
  );
}

function ToastCard({ ev, onClose }: { ev: NotificationEvent; onClose: () => void }) {
  const meta = renderMeta(ev);
  if (!meta) return null;

  const Wrap = ({ children }: { children: React.ReactNode }) =>
    meta.href ? (
      <Link href={meta.href} onClick={onClose} className="block">{children}</Link>
    ) : (
      <div className="block" role="status">{children}</div>
    );

  return (
    <div className="pointer-events-auto fade-in border border-border-strong bg-bg-elevated/95 backdrop-blur-md shadow-[var(--shadow-brut-sm)]">
      <Wrap>
        <div className="p-3 flex items-start gap-3 hover:bg-bg-surface/60 transition-colors">
          <div className="size-9 grid place-items-center font-display font-black text-lg shrink-0 border border-border-strong"
               style={{ color: meta.color, background: `${meta.color}1a` }}>
            {meta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-text-muted font-mono">
              {meta.label}
            </div>
            <div className="text-sm text-text-primary font-medium leading-snug mt-0.5">
              {meta.title}
            </div>
            {meta.sub && (
              <div className="text-xs text-text-muted truncate mt-0.5">{meta.sub}</div>
            )}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            aria-label="dismiss"
            className="text-text-muted hover:text-text-primary text-xs shrink-0 size-6 grid place-items-center"
          >
            ×
          </button>
        </div>
      </Wrap>
    </div>
  );
}

function renderMeta(ev: NotificationEvent): {
  icon: string; color: string; label: string; title: string; sub?: string; href?: string;
} | null {
  const d = ev.data ?? {};
  switch (ev.type) {
    case "badge_awarded":
      return {
        icon: String(d.badge_icon ?? "★"),
        color: "#4D8BF5",
        label: "Achievement unlocked",
        title: String(d.badge_name ?? "New badge earned"),
        href: undefined,
      };
    case "post_approved":
      return {
        icon: "✓",
        color: "#7BD89F",
        label: "Your post is live",
        title: "Your post passed review — it's now public.",
        sub: "Click to view",
        href: d.post_id ? `/post/${d.post_id}` : "/browse",
      };
    case "blog_published":
      return {
        icon: "✎",
        color: "#FFB38A",
        label: "Blog post published",
        title: String(d.title ?? "Your blog post is live."),
        href: d.slug ? `/blog/${d.slug}` : "/blog",
      };
    case "follow":
      return {
        icon: "@",
        color: "#58E0E8",
        label: "New follower",
        title: `@${d.follower_username} followed you`,
        href: d.follower_username ? `/u/${d.follower_username}` : "/notifications",
      };
    case "mention":
      return {
        icon: "@",
        color: "#4D8BF5",
        label: "Mention",
        title: `@${d.mentioner_username ?? "someone"} mentioned you`,
        sub: typeof d.snippet === "string" ? d.snippet : undefined,
        href: typeof d.url === "string" ? d.url : "/notifications",
      };
    case "reply":
      return {
        icon: "↩",
        color: "#FFB38A",
        label: "Reply",
        title: `@${d.replier_username ?? "someone"} replied to your comment`,
        href: typeof d.url === "string" ? d.url : "/notifications",
      };
    case "blog_comment":
      return {
        icon: "✎",
        color: "#58E0E8",
        label: "Blog comment",
        title: `@${d.commenter_username ?? "someone"} commented on your blog`,
        sub: typeof d.preview === "string" ? d.preview : undefined,
        href: d.blog_slug ? `/blog/${d.blog_slug}` : "/notifications",
      };
    default:
      return null;
  }
}
