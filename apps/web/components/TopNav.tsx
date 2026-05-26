"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { SearchPopover } from "@/components/SearchPopover";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";

/**
 * Top navigation.
 *
 * Mobile shape (≤md):  Logo · [🔍 icon] · [♥ icon] · [🔔 icon] · [☰ menu]
 *                       — tapping 🔍 expands a full-width search panel below.
 *
 * Desktop shape:        Logo · [inline search] · Characters · Anime · Blog ·
 *                       ♥ · 🔔 · UserMenu / Log in
 *
 * Why a search icon on mobile: previously the inline input competed with the
 * logo + 3 action icons in a narrow viewport and only ~50% of it was visible.
 * A dedicated tap target avoids the squeeze and gives the search its full
 * width when it actually matters (after the user taps).
 */
export function TopNav() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);  // mobile-only state
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const submit = (v: string) => {
    const query = v.trim();
    if (!query) { router.push("/anime"); closeAll(); return; }
    router.push(`/search?q=${encodeURIComponent(query)}`);
    closeAll();
  };

  const closeAll = () => {
    setMenuOpen(false);
    setSearchOpen(false);
  };

  // Close search/menu on route change — relies on user clicking a link, since
  // the inner SearchPopover triggers router.push directly.
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    document.addEventListener("keydown", onKey);
    // Lock body scroll while the search panel is open on mobile.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [searchOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b-2 border-border-strong bg-bg-base/95 backdrop-blur">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center gap-2 sm:gap-3 px-3 sm:px-4">
          <Link
            href="/"
            className="shrink-0 flex items-center"
            onClick={closeAll}
            aria-label="twarc home"
          >
            <span className="block sm:hidden"><Logo heightPx={32} /></span>
            <span className="hidden sm:block"><Logo heightPx={48} /></span>
          </Link>

          {/* Desktop: inline search input (always visible) */}
          <div className="hidden md:block flex-1 min-w-0 max-w-xl">
            <SearchPopover
              value={q}
              onChange={setQ}
              onSubmit={submit}
              inputClassName="w-full h-10 px-3 bg-bg-surface border-2 border-border-subtle font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-sakura focus:outline-none transition-colors"
              placeholder="search anime, characters…"
            />
          </div>

          {/* Mobile: spacer so the right-side icons sit at the right edge */}
          <div className="flex-1 md:hidden" />

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-3 text-sm">
            <Link href="/characters" className="text-text-secondary hover:text-sakura transition-colors px-2 py-1.5">Characters</Link>
            <Link href="/anime"      className="text-text-secondary hover:text-sakura transition-colors px-2 py-1.5">Anime</Link>
            <Link href="/blog"       className="text-text-secondary hover:text-sakura transition-colors px-2 py-1.5">Blog</Link>
            {isStaff && <Link href="/admin" className="text-cyber hover:text-sakura transition-colors px-2 py-1.5">Admin</Link>}
          </nav>

          {/* Right-side icons.
              Mobile order:  🔍  ·  🔔  ·  👤(avatar dropdown)  ·  ☰
              The avatar dropdown (UserMenu) carries all account shortcuts
              (Profile, Dashboard, My list, My posts, Settings, Sign out) so
              the hamburger drawer only has top-level navigation. */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Mobile-only search trigger */}
            <button
              type="button"
              onClick={() => { setMenuOpen(false); setSearchOpen(true); }}
              aria-label="Open search"
              title="Search"
              className="md:hidden size-10 grid place-items-center text-text-secondary hover:text-sakura active:text-sakura transition-colors"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>

            {/* Desktop-only watchlist heart shortcut — mobile users reach it
                via the avatar dropdown. */}
            {user && <WatchlistIcon />}
            {user && <NotificationBell />}
            {!user && !loading && (
              <Link href="/login" className="hidden sm:inline-flex px-2 py-1.5 text-sm text-text-secondary hover:text-sakura">Log in</Link>
            )}
            {!user && !loading && (
              <Link href="/register" className="hidden sm:inline-flex btn-brut !py-1.5 !px-3 !text-xs">Sign up →</Link>
            )}

            {/* Avatar dropdown — works on BOTH desktop and mobile now. */}
            {user && <UserMenu />}

            {/* Hamburger — navigation only (Anime, Characters, Blog). */}
            <button
              className="md:hidden size-10 grid place-items-center border-2 border-border-subtle text-text-primary hover:border-sakura active:border-sakura transition-colors"
              onClick={() => { setSearchOpen(false); setMenuOpen(!menuOpen); }}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span className="block w-4">
                <span className={`block h-[2px] bg-current mb-[5px] transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
                <span className={`block h-[2px] bg-current mb-[5px] transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
                <span className={`block h-[2px] bg-current transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile drawer — navigation only. Account items live in the avatar
            dropdown so this menu stays a short, focused page-jump list. */}
        {menuOpen && (
          <div className="md:hidden border-t-2 border-border-strong bg-bg-surface px-3 py-3 flex flex-col gap-1 fade-in">
            <DrawerLink href="/anime"      onClick={() => setMenuOpen(false)} label="Anime"      icon="◎" />
            <DrawerLink href="/characters" onClick={() => setMenuOpen(false)} label="Characters" icon="✿" />
            <DrawerLink href="/blog"       onClick={() => setMenuOpen(false)} label="Blog"       icon="✎" />
            {isStaff && <DrawerLink href="/admin" onClick={() => setMenuOpen(false)} label="Admin" icon="⚙" tone="cyber" />}
            {!user && (
              <>
                <div className="h-px bg-border-subtle my-1" />
                <DrawerLink href="/login" onClick={() => setMenuOpen(false)} label="Log in" icon="→" />
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="btn-brut !text-sm !py-2.5 self-start mt-1"
                >
                  Sign up →
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* MOBILE SEARCH OVERLAY — full-width panel that drops down from the nav.
          Body scroll is locked while open. Tap backdrop or ✕ to close. */}
      {searchOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col fade-in" role="dialog" aria-label="Search">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-bg-base/85 backdrop-blur"
            onClick={() => setSearchOpen(false)}
            aria-hidden
          />
          {/* Panel */}
          <div className="relative z-10 bg-bg-elevated border-b-2 border-text-primary p-3 shadow-[0_8px_0_0_var(--color-sakura)]">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <SearchPopover
                  value={q}
                  onChange={setQ}
                  onSubmit={submit}
                  onClose={() => setSearchOpen(false)}
                  inputClassName="w-full h-12 px-3 bg-bg-base border-2 border-border-strong font-mono text-base text-text-primary placeholder:text-text-muted focus:border-sakura focus:outline-none"
                  placeholder="search anime, characters…"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="size-12 grid place-items-center border-2 border-border-strong text-text-secondary hover:border-sakura hover:text-sakura active:text-sakura transition-colors shrink-0"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>
          {/* Clickable bottom area dismisses */}
          <div className="flex-1" onClick={() => setSearchOpen(false)} aria-hidden />
        </div>
      )}
    </>
  );
}

function DrawerLink({
  href, onClick, label, icon, tone,
}: {
  href: string; onClick: () => void; label: string; icon: string; tone?: "cyber";
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 h-11 px-3 font-display font-bold text-sm active:bg-bg-elevated transition-colors ${
        tone === "cyber" ? "text-cyber" : "text-text-secondary"
      }`}
    >
      <span aria-hidden className="w-5 text-center text-sakura">{icon}</span>
      {label}
    </Link>
  );
}

/**
 * Heart icon → /dashboard/list. Visible in nav when logged in so users
 * can jump to their watchlist in one tap from anywhere.
 */
function WatchlistIcon() {
  return (
    <Link
      href="/dashboard/list"
      className="size-10 grid place-items-center text-sakura hover:text-sakura-deep transition-colors"
      aria-label="My anime list"
      title="My anime list"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
        <path d="M12 21s-7-4.5-9.5-9C1 9.5 2.5 6 6 6c2 0 3.5 1 4 2 .5-1 2-2 4-2 3.5 0 5 3.5 3.5 6-2.5 4.5-9.5 9-9.5 9z" />
      </svg>
    </Link>
  );
}
