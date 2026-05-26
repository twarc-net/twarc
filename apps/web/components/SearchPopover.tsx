"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { discovery, type PostCard, type SearchUserHit, type TagCard as TagCardT } from "@/lib/api";

type Results = { tags: TagCardT[]; posts: PostCard[]; users: SearchUserHit[] };

type FlatHit =
  | { kind: "tag"; href: string; label: string; sub: string; cat: string; tag: TagCardT }
  | { kind: "user"; href: string; label: string; sub: string; user: SearchUserHit }
  | { kind: "post"; href: string; label: string; sub: string; post: PostCard }
  | { kind: "all"; href: string; label: string; sub: string };

const CAT_LABEL: Record<string, string> = {
  copyright: "anime", character: "character", artist: "artist",
  general: "tag",     meta: "meta",
};

/**
 * Wrapper around an <input> that opens a live-search dropdown.
 * The parent provides the input (so styling stays consistent).
 */
export function SearchPopover({
  value,
  onChange,
  onSubmit,
  inputClassName = "",
  placeholder = "search anime, characters, artists…",
  autoFocus = false,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  inputClassName?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) { setResults(null); return; }
    const t = setTimeout(() => {
      setLoading(true);
      discovery.search(q)
        .then(setResults)
        .catch(() => setResults({ tags: [], posts: [], users: [] }))
        .finally(() => setLoading(false));
    }, 150);
    return () => clearTimeout(t);
  }, [value]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        onClose?.();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  // Flatten results into ordered hits for keyboard nav.
  // Sub-line includes badges: anime → ★ score · year · post count;
  // character → ♥ MAL-favorites · post count; other → category · post count.
  const flat: FlatHit[] = [];
  if (results) {
    results.tags.slice(0, 5).forEach((t) => {
      const bits: string[] = [];
      if (t.category === "copyright") {
        if (t.score && t.score > 0) bits.push(`★ ${t.score.toFixed(1)}`);
        if (t.year_start) bits.push(String(t.year_start));
      } else if (t.category === "character") {
        if (t.favorites_count) bits.push(`♥ ${t.favorites_count.toLocaleString()}`);
      }
      bits.push(`${CAT_LABEL[t.category] ?? t.category}`);
      if (t.post_count > 0) bits.push(`${t.post_count} posts`);
      flat.push({
        kind: "tag", href: t.public_path,
        label: t.display_name ?? t.name.replace(/_/g, " "),
        sub: bits.join(" · "),
        cat: t.category, tag: t,
      });
    });
    results.users.slice(0, 3).forEach((u) => flat.push({
      kind: "user", href: `/u/${u.username}`, label: `@${u.username}`,
      sub: u.display_name ?? "", user: u,
    }));
    results.posts.slice(0, 4).forEach((p) => flat.push({
      kind: "post", href: `/post/${p.id}`, label: `post #${p.id}`,
      sub: `${p.width}×${p.height} · ★ ${p.score}`, post: p,
    }));
    if (value.trim()) {
      flat.push({
        kind: "all", href: `/search?q=${encodeURIComponent(value.trim())}`,
        label: `see all results`, sub: `for "${value.trim()}"`,
      });
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && flat.length > 0) {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp" && flat.length > 0) {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat.length > 0 && open) {
        const hit = flat[activeIdx];
        setOpen(false);
        onChange("");
        router.push(hit.href);
      } else {
        setOpen(false);
        onSubmit(value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      onClose?.();
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActiveIdx(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
      />

      {open && value.trim().length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-bg-elevated border-2 border-border-strong shadow-[var(--shadow-brut-sm)] max-h-[70vh] overflow-y-auto">
          {/* Sections */}
          {results?.tags && results.tags.length > 0 && (
            <SectionLabel label="tags & anime & characters" />
          )}
          {flat.filter((f) => f.kind === "tag").map((hit, i) => (
            <HitRow
              key={`tag-${(hit as Extract<FlatHit, {kind:"tag"}>).tag.id}`}
              hit={hit}
              active={flat[activeIdx] === hit}
              onPick={() => { setOpen(false); onChange(""); router.push(hit.href); }}
              onHover={() => setActiveIdx(flat.indexOf(hit))}
            />
          ))}

          {results?.users && results.users.length > 0 && (
            <SectionLabel label="users" />
          )}
          {flat.filter((f) => f.kind === "user").map((hit) => (
            <HitRow
              key={`user-${(hit as Extract<FlatHit, {kind:"user"}>).user.id}`}
              hit={hit}
              active={flat[activeIdx] === hit}
              onPick={() => { setOpen(false); onChange(""); router.push(hit.href); }}
              onHover={() => setActiveIdx(flat.indexOf(hit))}
            />
          ))}

          {results?.posts && results.posts.length > 0 && (
            <SectionLabel label="posts" />
          )}
          {flat.filter((f) => f.kind === "post").map((hit) => (
            <HitRow
              key={`post-${(hit as Extract<FlatHit, {kind:"post"}>).post.id}`}
              hit={hit}
              active={flat[activeIdx] === hit}
              onPick={() => { setOpen(false); onChange(""); router.push(hit.href); }}
              onHover={() => setActiveIdx(flat.indexOf(hit))}
            />
          ))}

          {/* See-all row */}
          {flat.filter((f) => f.kind === "all").map((hit) => (
            <HitRow
              key="see-all"
              hit={hit}
              active={flat[activeIdx] === hit}
              onPick={() => { setOpen(false); onSubmit(value); }}
              onHover={() => setActiveIdx(flat.indexOf(hit))}
            />
          ))}

          {!loading && results && results.tags.length === 0 && results.users.length === 0 && results.posts.length === 0 && (
            <div className="p-4 text-sm text-text-muted font-mono">no matches for "{value.trim()}"</div>
          )}
          {loading && (
            <div className="px-3 py-2 text-xs text-text-muted font-mono">searching…</div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-text-muted font-mono">
      {label}
    </div>
  );
}

function HitRow({
  hit, active, onPick, onHover,
}: {
  hit: FlatHit;
  active: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  if (hit.kind === "tag") {
    // Fall back to cover_url when cover_thumb isn't present (e.g. MAL-sourced
    // anime/character covers, which only have the external CDN URL).
    const img = hit.tag.cover_thumb ?? hit.tag.cover_url;
    const catBadgeColor =
      hit.tag.category === "copyright" ? "border-sakura/60 text-sakura bg-sakura/10"
      : hit.tag.category === "character" ? "border-cyber/60 text-cyber bg-cyber/10"
      : "border-border-strong text-text-muted bg-bg-surface";
    return (
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onPick(); }}
        onMouseEnter={onHover}
        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors border-l-4 ${
          active ? "border-sakura bg-sakura/10" : "border-transparent hover:bg-bg-surface"
        }`}
      >
        {img ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={img} alt="" className="size-12 object-cover border-2 border-border-strong shrink-0" loading="lazy" />
        ) : (
          <div className="size-12 grid place-items-center bg-bg-surface border-2 border-border-strong font-display font-black text-text-muted/40 shrink-0">
            {hit.label.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`px-1.5 py-0 text-[9px] font-mono uppercase tracking-wider border ${catBadgeColor}`}>
              {CAT_LABEL[hit.tag.category] ?? hit.tag.category}
            </span>
            {hit.tag.category === "copyright" && hit.tag.mal_rank && hit.tag.mal_rank <= 100 && (
              <span className="px-1.5 py-0 text-[9px] font-mono uppercase tracking-wider border border-cyber/60 text-cyber bg-cyber/10">
                #{hit.tag.mal_rank}
              </span>
            )}
          </div>
          <div className="font-display font-bold text-sm text-text-primary truncate leading-tight">{hit.label}</div>
          <div className="text-[11px] text-text-muted truncate font-mono">{hit.sub}</div>
        </div>
      </button>
    );
  }

  if (hit.kind === "user") {
    return (
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onPick(); }}
        onMouseEnter={onHover}
        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors border-l-2 ${
          active ? "border-sakura bg-sakura/5" : "border-transparent hover:bg-bg-surface"
        }`}
      >
        <span className="size-8 rounded-full bg-sakura/30 grid place-items-center text-xs font-bold text-sakura shrink-0">
          {hit.label.charAt(1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm text-text-primary">{hit.label}</div>
          {hit.sub && <div className="text-xs text-text-muted truncate">{hit.sub}</div>}
        </div>
      </button>
    );
  }

  if (hit.kind === "post") {
    return (
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onPick(); }}
        onMouseEnter={onHover}
        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors border-l-2 ${
          active ? "border-sakura bg-sakura/5" : "border-transparent hover:bg-bg-surface"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hit.post.thumb_url} alt="" className="size-10 object-cover border border-border-subtle" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm text-text-primary">{hit.label}</div>
          <div className="text-xs text-text-muted">{hit.sub}</div>
        </div>
      </button>
    );
  }

  // all results link
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onPick(); }}
      onMouseEnter={onHover}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 border-t-2 transition-colors ${
        active ? "border-sakura bg-sakura/5" : "border-border-subtle hover:bg-bg-surface"
      }`}
    >
      <div className="text-left">
        <div className="text-sm text-sakura font-mono">{hit.label}</div>
        <div className="text-xs text-text-muted">{hit.sub}</div>
      </div>
      <span className="text-sakura font-mono text-lg">→</span>
    </button>
  );
}
