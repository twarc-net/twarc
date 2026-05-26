"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { animeList, type AnimeListEntry, type AnimeListStatus } from "@/lib/api";

const TABS: { key: AnimeListStatus | "favorites" | "all"; label: string; tone: string }[] = [
  { key: "all",        label: "All",            tone: "border-sakura text-sakura" },
  { key: "watching",   label: "Watching",       tone: "border-matcha text-matcha" },
  { key: "planning",   label: "Plan to Watch",  tone: "border-cyber text-cyber" },
  { key: "completed",  label: "Completed",      tone: "border-sakura text-sakura" },
  { key: "on_hold",    label: "On Hold",        tone: "border-peach text-peach" },
  { key: "dropped",    label: "Dropped",        tone: "border-border-strong text-text-secondary" },
  { key: "favorites",  label: "Favorites",      tone: "border-sakura text-sakura" },
];

function ListInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = (sp.get("status") as AnimeListStatus | "favorites" | "all") ?? "all";

  const [items, setItems] = useState<AnimeListEntry[] | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    animeList.stats().then((r) => { setStats(r.by_status); setFavCount(r.favorite_count); }).catch(() => {});
  }, []);

  useEffect(() => {
    setItems(null);
    const status = (tab === "all" || tab === "favorites") ? undefined : tab;
    animeList.mine(status)
      .then((r) => {
        const data = tab === "favorites" ? r.data.filter((e) => e.is_favorite) : r.data;
        setItems(data);
      })
      .catch(() => setItems([]));
  }, [tab]);

  const setTab = (t: typeof tab) => {
    router.push(t === "all" ? "/dashboard/list" : `/dashboard/list?status=${t}`);
  };

  const tabCount = (k: string): number => {
    if (k === "all") return Object.values(stats ?? {}).reduce((a, b) => a + b, 0);
    if (k === "favorites") return favCount;
    return (stats ?? {})[k] ?? 0;
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display font-black text-3xl tracking-tight">my <span className="text-sakura">anime list</span></h1>
        <p className="text-text-secondary text-sm mt-1">Watching, planning, completed — keep track of your journey.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar border-y-2 border-border-strong py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => {
          const active = tab === t.key;
          const n = tabCount(t.key);
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 py-1.5 text-xs sm:text-sm font-mono border-2 transition-colors ${
                active ? t.tone + " bg-bg-surface" : "border-border-subtle text-text-muted hover:border-border-strong"
              }`}
            >
              {t.label}
              <span className={`ml-2 text-[10px] ${active ? "opacity-80" : "opacity-60"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {items === null ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed border-border-strong p-10 text-center text-text-muted">
          Nothing here yet. <Link href="/anime" className="text-sakura hover:underline">Browse anime →</Link> and click <span className="text-cyber">Add to List</span> to start.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((e) => e.anime && (
            <li key={e.id} className="border-2 border-text-primary bg-bg-surface flex gap-3 p-2.5 hover:border-sakura transition-colors">
              <Link href={e.anime.public_path} className="shrink-0 size-24 sm:size-28 bg-bg-elevated overflow-hidden border-2 border-border-strong">
                {e.anime.cover_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={e.anime.cover_url} alt={e.anime.title} className="size-full object-cover" loading="lazy" />
                ) : null}
              </Link>
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <Link href={e.anime.public_path} className="font-display font-bold text-sm sm:text-base leading-tight hover:text-sakura truncate">
                  {e.anime.title}
                </Link>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-text-muted">
                  {e.anime.year && <span>{e.anime.year}</span>}
                  {e.anime.episodes && <span>· {e.anime.episodes} ep</span>}
                  {e.anime.score > 0 && <span className="text-sakura">★ {e.anime.score.toFixed(1)}</span>}
                </div>
                <div className="flex items-center gap-2 mt-auto text-[10px] sm:text-xs font-mono">
                  <span className={`px-1.5 py-0.5 border ${
                    e.status === "watching" ? "border-matcha/40 text-matcha" :
                    e.status === "completed" ? "border-sakura/40 text-sakura" :
                    e.status === "planning" ? "border-cyber/40 text-cyber" :
                    e.status === "on_hold" ? "border-peach/40 text-peach" :
                    "border-border-strong text-text-muted"
                  }`}>{e.status.replace("_", " ")}</span>
                  {e.is_favorite && <span className="text-sakura">♥</span>}
                  {e.user_score && <span className="text-text-secondary">your rating: {e.user_score}/10</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MyListPage() {
  return (
    <Suspense fallback={<div className="text-text-muted font-mono text-sm">loading…</div>}>
      <ListInner />
    </Suspense>
  );
}
