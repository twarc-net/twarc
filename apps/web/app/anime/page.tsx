"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { discovery, type TagCard as TagCardT } from "@/lib/api";
import { AnimeTagCard } from "@/components/AnimeTagCard";

type Sort = "popular" | "score" | "views" | "favs" | "name";

const SORT_LABELS: Record<Sort, string> = {
  popular:  "Most popular",
  score:    "Top rated",
  views:    "Trending on twarc",
  favs:     "Most favorited",
  name:     "A → Z",
};

function AnimeIndexInner() {
  const sp = useSearchParams();
  const router = useRouter();

  const sort  = (sp.get("sort") as Sort) ?? "popular";
  const genre = sp.get("genre") ?? "";
  const year  = Number(sp.get("year") ?? 0) || 0;
  const qRaw  = sp.get("q") ?? "";

  // Local search input — synced to URL on debounce.
  const [searchInput, setSearchInput] = useState(qRaw);
  useEffect(() => { setSearchInput(qRaw); }, [qRaw]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== qRaw) {
        setQuery({ q: searchInput });
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const [items, setItems] = useState<TagCardT[] | null>(null);
  const [genres, setGenres] = useState<Array<{ name: string; count: number }>>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [genreOpen, setGenreOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const genrePopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    discovery.genres().then((r) => setGenres(r.data)).catch(() => {});
  }, []);

  // Close genre popover on outside click
  useEffect(() => {
    if (!genreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (genrePopRef.current && !genrePopRef.current.contains(e.target as Node)) setGenreOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [genreOpen]);

  useEffect(() => {
    setItems(null); setPage(1); setHasMore(true);
    discovery.anime(sort, {
      genre: genre || undefined,
      year:  year  || undefined,
      q:     qRaw  || undefined,
      page: 1,
      per_page: 30,
    })
      .then((r) => {
        setItems(r.data);
        setTotal(r.meta.total);
        setHasMore(r.meta.page < r.meta.last_page);
      })
      .catch(() => { setItems([]); setHasMore(false); });
  }, [sort, genre, year, qRaw]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || items === null) return;
    setLoading(true);
    const next = page + 1;
    try {
      const r = await discovery.anime(sort, {
        genre: genre || undefined,
        year:  year  || undefined,
        q:     qRaw  || undefined,
        page: next, per_page: 30,
      });
      setItems((prev) => [...(prev ?? []), ...r.data]);
      setPage(next);
      setHasMore(r.meta.page < r.meta.last_page);
    } catch { setHasMore(false); }
    finally { setLoading(false); }
  }, [loading, hasMore, items, page, sort, genre, year, qRaw]);

  useEffect(() => {
    if (!sentinel.current) return;
    const rootMargin = typeof window !== "undefined" && window.innerWidth < 640 ? "400px" : "1000px";
    const o = new IntersectionObserver((es) => { if (es[0].isIntersecting) loadMore(); }, { rootMargin });
    o.observe(sentinel.current);
    return () => o.disconnect();
  }, [loadMore]);

  function setQuery(next: Partial<{ sort: Sort; genre: string; year: number; q: string }>) {
    const params = new URLSearchParams();
    const merged = { sort, genre, year, q: qRaw, ...next };
    if (merged.sort && merged.sort !== "popular") params.set("sort", merged.sort);
    if (merged.genre) params.set("genre", merged.genre);
    if (merged.year)  params.set("year",  String(merged.year));
    if (merged.q)     params.set("q",     merged.q);
    router.push(`/anime${params.toString() ? "?" + params.toString() : ""}`);
  }

  function clearAll() {
    setSearchInput("");
    router.push("/anime");
  }

  const activeCount = (sort !== "popular" ? 1 : 0) + (genre ? 1 : 0) + (year ? 1 : 0) + (qRaw ? 1 : 0);

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: cur - 1979 }, (_, i) => cur - i);
  }, []);

  return (
    <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-10 overflow-x-hidden">
      <header className="mb-3 sm:mb-5">
        <h1 className="font-display font-black text-2xl sm:text-4xl md:text-5xl tracking-tight leading-tight">
          all <span className="text-sakura">anime</span>
        </h1>
        {total > 0 && (
          <p className="text-[11px] sm:text-sm font-mono text-text-muted mt-1">
            {total.toLocaleString()} series · halal-friendly catalog
          </p>
        )}
      </header>

      {/* ============ FILTER BAR (sticky) ============ */}
      <div className="sticky top-16 sm:top-20 z-30 -mx-3 sm:-mx-4 bg-bg-base/95 backdrop-blur border-y-2 border-border-strong mb-3 sm:mb-5">
        <div className="px-3 sm:px-4 py-2 flex items-center gap-2">
          {/* Search input — flexes to take available width */}
          <div className="relative flex-1 min-w-0">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="search anime…"
              className="w-full h-9 pl-8 pr-2 bg-bg-surface border-2 border-border-subtle font-mono text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-sakura focus:outline-none"
            />
            <svg aria-hidden viewBox="0 0 24 24" className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setQuery({ sort: e.target.value as Sort })}
            className="shrink-0 h-9 pl-2 pr-6 bg-bg-surface border-2 border-border-subtle text-xs font-mono text-text-secondary focus:border-sakura focus:outline-none appearance-none cursor-pointer"
          >
            {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
              <option key={s} value={s}>{SORT_LABELS[s]}</option>
            ))}
          </select>

          {/* Year dropdown */}
          <select
            value={year || ""}
            onChange={(e) => setQuery({ year: Number(e.target.value) || 0 })}
            className="shrink-0 h-9 pl-2 pr-6 bg-bg-surface border-2 border-border-subtle text-xs font-mono text-text-secondary focus:border-sakura focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">any year</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Genre popover trigger */}
          <div ref={genrePopRef} className="relative shrink-0">
            <button
              onClick={() => setGenreOpen(!genreOpen)}
              className={`h-9 px-2.5 text-xs font-mono border-2 transition-colors ${
                genre ? "border-cyber text-cyber bg-cyber/10" : "border-border-subtle text-text-secondary hover:border-border-strong"
              }`}
            >
              {genre || "genre"} ▾
            </button>
            {genreOpen && (
              <div className="absolute right-0 top-full mt-1 z-40 w-[260px] max-h-[60vh] overflow-y-auto bg-bg-elevated border-2 border-text-primary shadow-[5px_5px_0_0_var(--color-sakura)] fade-in">
                <button
                  onClick={() => { setQuery({ genre: "" }); setGenreOpen(false); }}
                  className={`w-full px-3 h-9 text-left text-xs font-mono hover:bg-bg-surface flex items-center justify-between ${
                    !genre ? "text-sakura" : "text-text-secondary"
                  }`}
                >
                  <span>all genres</span>
                  {!genre && <span>✓</span>}
                </button>
                <div className="h-px bg-border-subtle" />
                {genres.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => { setQuery({ genre: g.name }); setGenreOpen(false); }}
                    className={`w-full px-3 h-9 text-left text-xs font-mono hover:bg-bg-surface flex items-center justify-between ${
                      genre === g.name ? "text-cyber" : "text-text-secondary"
                    }`}
                  >
                    <span className="truncate">{g.name}</span>
                    <span className="text-text-muted ml-2">{g.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active filter chips + clear */}
        {activeCount > 0 && (
          <div className="px-3 sm:px-4 pb-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted mr-1">filters:</span>
            {qRaw && (
              <Chip onClear={() => setQuery({ q: "" })}>“{qRaw}”</Chip>
            )}
            {sort !== "popular" && (
              <Chip tone="sakura" onClear={() => setQuery({ sort: "popular" })}>{SORT_LABELS[sort]}</Chip>
            )}
            {year > 0 && (
              <Chip tone="sakura" onClear={() => setQuery({ year: 0 })}>{year}</Chip>
            )}
            {genre && (
              <Chip tone="cyber" onClear={() => setQuery({ genre: "" })}>{genre}</Chip>
            )}
            <button
              onClick={clearAll}
              className="h-7 px-2 text-[11px] font-mono text-text-muted hover:text-sakura transition-colors ml-auto"
            >
              clear all
            </button>
          </div>
        )}
      </div>

      {/* ============ GRID ============ */}
      {items === null ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[2/3] border-2 border-border-subtle" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed border-border-strong p-6 sm:p-10 text-center text-text-muted text-sm">
          No anime match these filters.
          {activeCount > 0 && (
            <button onClick={clearAll} className="block mx-auto mt-3 text-sakura hover:underline text-xs">clear filters →</button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
            {items.map((t, i) => <AnimeTagCard key={t.id} tag={t} idx={i} />)}
          </div>
          <div ref={sentinel} className="py-8 sm:py-10 grid place-items-center">
            {loading && hasMore && (
              <div className="text-text-muted font-mono text-xs sm:text-sm flex items-center gap-2">
                <span className="size-2 rounded-full bg-sakura animate-pulse" /> loading…
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <div className="text-text-muted font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em]">end · {items.length} anime</div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

function Chip({ children, onClear, tone }: { children: React.ReactNode; onClear: () => void; tone?: "sakura" | "cyber" }) {
  const cls =
    tone === "sakura" ? "border-sakura text-sakura bg-sakura/10"
    : tone === "cyber" ? "border-cyber text-cyber bg-cyber/10"
    : "border-border-strong text-text-secondary bg-bg-surface";
  return (
    <span className={`inline-flex items-center h-7 pl-2 pr-1 gap-1.5 border-2 text-[11px] font-mono ${cls}`}>
      <span className="truncate max-w-[120px]">{children}</span>
      <button onClick={onClear} aria-label="Remove filter" className="size-5 grid place-items-center hover:text-text-primary">
        ×
      </button>
    </span>
  );
}

export default function AnimeIndex() {
  return (
    <Suspense fallback={<main className="flex-1 mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8"><div className="skeleton h-16 mb-6" /></main>}>
      <AnimeIndexInner />
    </Suspense>
  );
}
