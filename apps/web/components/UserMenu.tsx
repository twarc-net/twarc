"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/Avatar";
import { VerifiedTick } from "@/components/VerifiedTick";

/**
 * Click-target in the top nav that opens a dropdown with the user's
 * personal-area shortcuts: profile / dashboard / lists / settings / sign-out.
 *
 * Closes on outside-click and Escape; positioned right-aligned under the
 * trigger. Hidden on mobile — the hamburger drawer covers the same surface.
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={wrapRef} className="relative">
      {/* Desktop trigger — full pill with avatar + username + chevron */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="hidden md:flex items-center gap-2 px-2 py-1 border-2 border-border-subtle hover:border-sakura active:border-sakura transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar user={user} size="xs" />
        <span className="text-text-primary text-sm">
          {user.username}
          <VerifiedTick verified={user.is_verified} size="xs" />
        </span>
        <span className={`text-text-muted text-[10px] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>▾</span>
      </button>

      {/* Mobile trigger — avatar-only, sized as a tap target */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="md:hidden size-10 grid place-items-center border-2 border-border-subtle hover:border-sakura active:border-sakura transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar user={user} size="xs" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 min-w-[240px] border-2 border-text-primary bg-bg-elevated shadow-[5px_5px_0_0_var(--color-sakura)] py-1 fade-in z-50"
        >
          <div className="px-3 py-2 border-b border-border-subtle">
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-mono">signed in as</div>
            <div className="font-display font-bold text-text-primary truncate">
              {user.display_name ?? user.username}
              <VerifiedTick verified={user.is_verified} size="xs" />
            </div>
            <div className="text-xs font-mono text-text-muted">@{user.username}</div>
          </div>
          <MenuLink href={`/u/${user.username}`} onClick={() => setOpen(false)} icon="@" label="View profile" />
          <MenuLink href="/dashboard"            onClick={() => setOpen(false)} icon="◆" label="Dashboard" />
          <MenuLink href="/dashboard/list"       onClick={() => setOpen(false)} icon="♥" label="My anime list" />
          <MenuLink href="/dashboard/posts"      onClick={() => setOpen(false)} icon="▤" label="My posts" />
          <MenuLink href="/dashboard/blog"       onClick={() => setOpen(false)} icon="✎" label="My blog" />
          <MenuLink href="/dashboard/profile"    onClick={() => setOpen(false)} icon="⚙" label="Settings" />
          <div className="border-t border-border-subtle my-1" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-3 px-3 h-10 text-left text-sm font-mono text-sakura hover:bg-sakura/10 transition-colors"
          >
            <span aria-hidden className="w-4 text-center">⏏</span>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, onClick, icon, label }: { href: string; onClick: () => void; icon: string; label: string }) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 h-10 text-sm text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors"
    >
      <span aria-hidden className="w-4 text-center text-sakura">{icon}</span>
      {label}
    </Link>
  );
}
