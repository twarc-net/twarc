"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { discovery, type TagCard as TagCardT } from "@/lib/api";
import { CharacterTagCard } from "@/components/CharacterTagCard";

type Sort = "favs" | "views" | "posts" | "name";

const SORT_LABELS: Record<Sort, string> = {
  favs:  "Most loved",
  views: "Most viewed",
  posts: "Most posts",
  name:  "A → Z",
};

function CharactersInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const sort = (sp.get("sort") as Sort) ?? "favs";
  const qRaw = sp.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(qRaw);
  useEffect(() => { setSearchInput(qRaw); }, [qRaw]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== qRaw) setQuery({ q: searchInput });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const [items, setItems] = useState<TagCardT[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(null); setPage(1); setHasMore(true);
    discovery.characters(sort, { q: qRaw || undefined, page: 1, per_page: 36 })
      .then((r) => { setItems(r.data); setTotal(r.meta.total); setHasMore(r.meta.page < r.meta.last_page); })
      .catch(() => { setItems([]); setHasMore(false); });
  }, [sort, qRaw]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || items === null) return;
    setLoading(true);
    const next = page + 1;
    try {
      const r = await discovery.characters(sort, { q: qRaw || undefined, page: next, per_page: 36 });
      setItems((prev) => [...(prev ?? []), ...r.data]);
      setPage(next);
      setHasMore(r.meta.page < r.meta.last_page);
    } catch { setHasMore(false); }
    finally { setLoading(false); }
  }, [loading, hasMore, items, page, sort, qRaw]);

  useEffect(() => {
    if (!sentinel.current) return;
    const rootMargin = typeof window !== "undefined" && window.innerWidth < 640 ? "400px" : "1000px";
    const o = new IntersectionObserver((es) => { if (es[0].isIntersecting) loadMore(); }, { rootMargin });
    o.observe(sentinel.current);
    return () => o.disconnect();
  }, [loadMore]);

  function setQuery(next: Partial<{ sort: Sort; q: string }>) {
    const params = new URLSearchParams();
    const merged = { sort, q: qRaw, ...next };
    if (merged.sort && merged.sort !== "favs") params.set("sort", merged.sort);
    if (merged.q)                                 params.set("q",    merged.q);
    router.push(`/characters${params.toString() ? "?" + params.toString() : ""}`);
  }

  function clearAll() { setSearchInput(""); router.push("/characters"); }
  const activeCount = (sort !== "favs" ? 1 : 0) + (qRaw ? 1 : 0);

  return (
    <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-10 overflow-x-hidden">
      <header className="mb-3 sm:mb-5">
        <h1 className="font-display font-black text-2xl sm:text-4xl md:text-5xl tracking-tight leading-tight">
          all <span className="text-sakura">characters</span>
        </h1>
        {total > 0 && (
          <p className="text-[11px] sm:text-sm font-mono text-text-muted mt-1">
            {total.toLocaleString()} characters
          </p>
        )}
      </header>

      <div className="sticky top-16 sm:top-20 z-30 -mx-3 sm:-mx-4 bg-bg-base/95 backdrop-blur border-y-2 border-border-strong mb-3 sm:mb-5">
        <div className="px-3 sm:px-4 py-2 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="search characters…"
              className="w-full h-9 pl-8 pr-2 bg-bg-surface border-2 border-border-subtle font-mono text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-sakura focus:outline-none"
            />
            <svg aria-hidden viewBox="0 0 24 24" className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          <select
            value={sort}
            onChange={(e) => setQuery({ sort: e.target.value as Sort })}
            className="shrink-0 h-9 pl-2 pr-6 bg-bg-surface border-2 border-border-subtle text-xs font-mono text-text-secondary focus:border-sakura focus:outline-none appearance-none cursor-pointer"
          >
            {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
              <option key={s} value={s}>{SORT_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {activeCount > 0 && (
          <div className="px-3 sm:px-4 pb-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted mr-1">filters:</span>
            {qRaw && (
              <span className="inline-flex items-center h-7 pl-2 pr-1 gap-1.5 border-2 border-border-strong text-text-secondary bg-bg-surface text-[11px] font-mono">
                <span className="truncate max-w-[140px]">“{qRaw}”</span>
                <button onClick={() => setQuery({ q: "" })} aria-label="Clear search" className="size-5 grid place-items-center">×</button>
              </span>
            )}
            {sort !== "favs" && (
              <span className="inline-flex items-center h-7 pl-2 pr-1 gap-1.5 border-2 border-sakura text-sakura bg-sakura/10 text-[11px] font-mono">
                <span className="truncate max-w-[140px]">{SORT_LABELS[sort]}</span>
                <button onClick={() => setQuery({ sort: "favs" })} aria-label="Reset sort" className="size-5 grid place-items-center">×</button>
              </span>
            )}
            <button onClick={clearAll} className="h-7 px-2 text-[11px] font-mono text-text-muted hover:text-sakura transition-colors ml-auto">clear all</button>
          </div>
        )}
      </div>

      {items === null ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: 21 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4] border-2 border-border-subtle" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed border-border-strong p-6 sm:p-10 text-center text-text-muted text-sm">
          No characters match. {activeCount > 0 && <button onClick={clearAll} className="block mx-auto mt-3 text-sakura hover:underline text-xs">clear filters →</button>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
            {items.map((t, i) => <CharacterTagCard key={t.id} tag={t} idx={i} />)}
          </div>
          <div ref={sentinel} className="py-8 sm:py-10 grid place-items-center">
            {loading && hasMore && <span className="text-text-muted font-mono text-xs sm:text-sm">loading…</span>}
            {!hasMore && items.length > 0 && (
              <div className="text-text-muted font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em]">end · {items.length}</div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

export default function CharactersIndex() {
  return (
    <Suspense fallback={<main className="flex-1 mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8"><div className="skeleton h-16 mb-6" /></main>}>
      <CharactersInner />
    </Suspense>
  );
}
