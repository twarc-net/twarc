"use client";

import { useEffect, useRef, useState } from "react";
import { animeList, type AnimeListEntry, type AnimeListStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const STATUS_LABELS: Record<AnimeListStatus, string> = {
  watching:  "Watching",
  planning:  "Plan to Watch",
  completed: "Completed",
  on_hold:   "On Hold",
  dropped:   "Dropped",
};
const STATUS_COLORS: Record<AnimeListStatus, string> = {
  watching:  "var(--color-matcha)",
  planning:  "var(--color-cyber)",
  completed: "var(--color-sakura)",
  on_hold:   "var(--color-peach)",
  dropped:   "var(--color-text-muted)",
};

/**
 * Two-button cluster on an anime detail page:
 *   - "Add to list ▾"  with status dropdown (watching, plan to watch, etc.)
 *   - Heart toggle for favorite
 *
 * Loads the user's current entry once when mounted, then optimistically
 * updates state on every action.
 */
export function AnimeListButton({ animeName }: { animeName: string }) {
  const { user } = useAuth();
  const [entry, setEntry] = useState<AnimeListEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    animeList.get(animeName).then((r) => setEntry(r.entry)).catch(() => {});
  }, [animeName, user]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!user) return null;

  const setStatus = async (s: AnimeListStatus) => {
    setBusy(true);
    try {
      const r = await animeList.upsert(animeName, { status: s });
      setEntry(r.entry);
      setOpen(false);
    } finally { setBusy(false); }
  };

  const toggleFavorite = async () => {
    setBusy(true);
    try {
      const r = await animeList.upsert(animeName, { is_favorite: !(entry?.is_favorite) });
      setEntry(r.entry);
    } finally { setBusy(false); }
  };

  const removeFromList = async () => {
    if (!confirm("Remove this anime from your list?")) return;
    setBusy(true);
    try {
      await animeList.remove(animeName);
      setEntry(null);
      setOpen(false);
    } finally { setBusy(false); }
  };

  const status = entry?.status;
  const statusLabel = status ? STATUS_LABELS[status] : "Add to List";
  const statusColor = status ? STATUS_COLORS[status] : "var(--color-sakura)";

  return (
    <div className="flex gap-2 items-stretch">
      <div ref={popRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          disabled={busy}
          className="border-2 border-text-primary bg-bg-surface px-3 py-2 font-display font-bold text-sm flex items-center gap-2 shadow-[4px_4px_0_0_var(--color-sakura)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--color-sakura)] transition-all"
          aria-expanded={open}
          style={{ color: statusColor }}
        >
          <span className="size-2" style={{ background: statusColor }} aria-hidden />
          {statusLabel}
          <span className="text-text-muted text-xs">▾</span>
        </button>
        {open && (
          <div className="absolute z-50 mt-1 left-0 min-w-[210px] border-2 border-text-primary bg-bg-elevated shadow-[var(--shadow-brut-sm)] py-1 fade-in">
            {(Object.keys(STATUS_LABELS) as AnimeListStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                disabled={busy}
                className={`w-full text-left px-3 py-2 text-sm font-mono flex items-center gap-2 hover:bg-bg-surface transition-colors ${
                  status === s ? "text-sakura font-bold" : "text-text-secondary"
                }`}
              >
                <span className="size-1.5" style={{ background: STATUS_COLORS[s] }} aria-hidden />
                {STATUS_LABELS[s]}
                {status === s && <span className="ml-auto text-sakura">✓</span>}
              </button>
            ))}
            {entry && (
              <>
                <div className="border-t border-border-subtle my-1" />
                <button onClick={removeFromList} disabled={busy}
                  className="w-full text-left px-3 py-2 text-sm font-mono text-sakura hover:bg-sakura/10 transition-colors">
                  remove from list
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <button
        onClick={toggleFavorite}
        disabled={busy}
        aria-label={entry?.is_favorite ? "Unfavorite" : "Favorite"}
        title={entry?.is_favorite ? "Favorited" : "Add to favorites"}
        className={`size-10 grid place-items-center border-2 border-text-primary transition-all shadow-[4px_4px_0_0_var(--color-cyber)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--color-cyber)] ${
          entry?.is_favorite ? "bg-sakura text-bg-base" : "bg-bg-surface text-sakura"
        }`}
      >
        ♥
      </button>
    </div>
  );
}
