"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { posts, type PostCard } from "@/lib/api";
import { PostTile } from "@/components/PostTile";
import { PostGridSkeleton } from "@/components/Skeleton";

type Sort = "new" | "top";

function BrowseInner() {
  const sp = useSearchParams();
  const router = useRouter();

  const tags = sp.get("tags") ?? "";
  const sort = (sp.get("sort") as Sort) ?? "new";
  const rating = "safe" as const;

  const [items, setItems] = useState<PostCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems([]); setPage(1); setHasMore(true); setTotal(0); setInitialLoading(true);
    posts.list({ tags, sort, rating, page: 1 })
      .then((r) => { setItems(r.data); setTotal(r.meta.total); setHasMore(r.meta.page < r.meta.last_page); })
      .catch(() => setHasMore(false))
      .finally(() => setInitialLoading(false));
  }, [tags, sort]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || initialLoading) return;
    setLoading(true);
    const next = page + 1;
    try {
      const r = await posts.list({ tags, sort, rating, page: next });
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...r.data.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
      setHasMore(r.meta.page < r.meta.last_page);
    } catch { setHasMore(false); }
    finally { setLoading(false); }
  }, [loading, hasMore, initialLoading, page, tags, sort]);

  useEffect(() => {
    if (!sentinel.current) return;
    // Smaller rootMargin on mobile (smaller viewport) so we don't trigger
    // multiple page-loads while the user is still reading the first batch.
    const rootMargin = typeof window !== "undefined" && window.innerWidth < 640 ? "400px" : "1000px";
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin },
    );
    obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [loadMore]);

  const setQuery = (next: Partial<{ tags: string; sort: Sort }>) => {
    const params = new URLSearchParams();
    const merged = { tags, sort, ...next };
    if (merged.tags) params.set("tags", merged.tags);
    if (merged.sort && merged.sort !== "new") params.set("sort", merged.sort);
    router.push(`/browse${params.toString() ? "?" + params.toString() : ""}`);
  };

  const activeTags = tags.trim() ? tags.split(/\s+/) : [];

  return (
    <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-10">
      {/* HEADER */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-baseline justify-between gap-3 mb-2 sm:mb-4">
          <h1 className="font-display font-black text-2xl sm:text-4xl tracking-tight">
            {activeTags.length > 0 ? (
              <>filtered <span className="font-mono text-base sm:text-2xl text-sakura ml-1">· {activeTags.length} tag{activeTags.length > 1 ? "s" : ""}</span></>
            ) : (
              <>browse <span className="text-sakura">all</span></>
            )}
          </h1>
          <div className="text-[11px] sm:text-sm font-mono text-text-muted shrink-0">
            {initialLoading ? "…" : `${items.length}/${total}`}
          </div>
        </div>

        {/* Active tag chips — chunkier tap targets on mobile */}
        {activeTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 fade-in">
            {activeTags.map((t) => (
              <button
                key={t}
                onClick={() => setQuery({ tags: activeTags.filter((x) => x !== t).join(" ") })}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 border-2 border-sakura text-sakura font-mono text-xs bg-sakura/10 active:bg-sakura active:text-bg-base transition-colors"
                title={`Remove "${t}"`}
              >
                <span>{t}</span>
                <span className="opacity-60 text-sm leading-none">×</span>
              </button>
            ))}
            <button
              onClick={() => setQuery({ tags: "" })}
              className="h-8 px-2.5 text-xs font-mono text-text-muted hover:text-sakura transition-colors"
            >
              clear all
            </button>
          </div>
        )}

        {/* Filter bar — sticky, big tap targets, full-bleed on mobile */}
        <div className="sticky top-16 sm:top-20 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 py-1.5 sm:py-2 border-y-2 border-border-strong bg-bg-base/95 backdrop-blur flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-mono text-text-muted">sort</span>
          <div className="flex gap-1.5">
            <FilterPill label="new" active={sort === "new"} onClick={() => setQuery({ sort: "new" })} />
            <FilterPill label="top" active={sort === "top"} onClick={() => setQuery({ sort: "top" })} />
          </div>
          <div className="ml-auto text-[10px] sm:text-xs font-mono text-text-muted hidden sm:block">
            scroll to load more
          </div>
        </div>
      </div>

      {/* GRID */}
      {initialLoading && items.length === 0 ? (
        <PostGridSkeleton count={12} />
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed border-border-strong bg-bg-surface/40 p-6 sm:p-12 text-center fade-in">
          <div className="font-display font-black text-xl sm:text-2xl text-text-secondary mb-2">
            {activeTags.length > 0 ? "no matches" : "nothing here yet"}
          </div>
          <p className="text-text-muted text-sm mb-4 break-words">
            {activeTags.length > 0 ? `No posts match "${tags}".` : "Be the first to post — sign up and upload."}
          </p>
          {activeTags.length > 0 ? (
            <button onClick={() => setQuery({ tags: "" })} className="btn-brut !text-sm !py-2 !px-4">clear filters</button>
          ) : (
            <Link href="/register" className="btn-brut !text-sm !py-2 !px-4">join →</Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2.5">
            {items.map((p, i) => <PostTile key={p.id} post={p} idx={i % 24} />)}
          </div>

          <div ref={sentinel} className="py-10 sm:py-12 grid place-items-center">
            {loading && hasMore && (
              <div className="flex items-center gap-3 text-text-muted font-mono text-sm">
                <span className="size-2 rounded-full bg-sakura animate-pulse" />
                loading more…
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <div className="text-text-muted font-mono text-[11px] sm:text-xs uppercase tracking-[0.2em]">
                end · {items.length} posts
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 text-xs font-mono lowercase border-2 transition-colors ${
        active
          ? "border-sakura text-sakura bg-sakura/10"
          : "border-border-subtle text-text-muted hover:border-border-strong active:border-border-strong"
      }`}
    >
      {label}
    </button>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-4 py-6 sm:py-8">
        <PostGridSkeleton count={12} />
      </main>
    }>
      <BrowseInner />
    </Suspense>
  );
}
