"use client";

import { useState } from "react";
import type { AchievementProgress } from "@/lib/api";

/**
 * Steam-style achievement showcase for a user profile.
 *
 * Earned achievements are rendered in full color; locked ones are greyed
 * with a progress bar showing how close the user is. The "next 3 locked"
 * are surfaced as a separate header row to drive engagement ("only 47 more
 * favs to Beloved Artist!").
 *
 * Click any tile to flip its visibility filter; defaults to "all".
 */
export function AchievementGrid({ items }: { items: AchievementProgress[] }) {
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  if (!items || items.length === 0) return null;

  const earned = items.filter((a) => a.earned);
  const locked = items.filter((a) => !a.earned);

  // Closest-to-completion locked ones go first — these are the dopamine hooks.
  const nextUp = [...locked].sort((a, b) => b.progress - a.progress).slice(0, 3);

  const filtered =
    filter === "earned" ? earned :
    filter === "locked" ? locked :
                          items;

  return (
    <section className="my-8">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-display font-black text-2xl tracking-tight">
          <span className="text-sakura">achievements</span>
          <span className="ml-2 text-sm font-mono text-text-muted">{earned.length} / {items.length}</span>
        </h2>
        <div className="flex gap-1 text-xs font-mono">
          {(["all", "earned", "locked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 transition-colors lowercase ${
                filter === f
                  ? "text-sakura border-b border-sakura -mb-px"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filter === "all" && nextUp.length > 0 && (
        <div className="mb-5 border border-border-subtle bg-bg-surface p-3 sm:p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-cyber font-mono mb-2">
            Closest to unlocking →
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {nextUp.map((a) => <Tile key={a.slug} a={a} compact />)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {filtered.map((a) => <Tile key={a.slug} a={a} />)}
      </div>
    </section>
  );
}

function Tile({ a, compact = false }: { a: AchievementProgress; compact?: boolean }) {
  const dim = !a.earned;
  return (
    <div
      title={a.description ?? ""}
      className={`border p-2.5 sm:p-3 flex items-start gap-3 transition-colors ${
        a.earned
          ? "border-sakura/30 bg-sakura/5 hover:bg-sakura/10"
          : "border-border-subtle bg-bg-surface/50 hover:border-border-strong"
      }`}
    >
      <div
        className={`size-10 grid place-items-center font-display font-black text-xl shrink-0 border ${dim ? "opacity-35" : ""}`}
        style={{ color: a.color, borderColor: `${a.color}55`, background: `${a.color}11` }}
        aria-hidden
      >
        {a.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-display font-bold leading-tight truncate ${dim ? "text-text-muted" : "text-text-primary"}`}>
          {a.name}
        </div>
        {!compact && (
          <div className={`text-xs leading-snug mt-0.5 line-clamp-2 ${dim ? "text-text-muted/80" : "text-text-secondary"}`}>
            {a.description}
          </div>
        )}
        {!a.earned && a.goal && (
          <div className="mt-1.5">
            <div className="h-1 bg-border-subtle overflow-hidden">
              <div className="h-full bg-cyber transition-all" style={{ width: `${Math.round((a.progress ?? 0) * 100)}%` }} />
            </div>
            <div className="text-[10px] font-mono text-text-muted mt-1">
              {a.current ?? 0} / {a.goal}
            </div>
          </div>
        )}
        {a.earned && a.awarded_at && (
          <div className="text-[10px] font-mono text-matcha mt-1">
            unlocked · {new Date(a.awarded_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
