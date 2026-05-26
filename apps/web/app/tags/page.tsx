"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { discovery, type TagCard as TagCardT } from "@/lib/api";

type Sort = "views" | "favs" | "posts" | "name";
const CATS = [
  { key: "general",   label: "general"   },
  { key: "copyright", label: "anime"     },
  { key: "character", label: "characters" },
  { key: "artist",    label: "artists"   },
  { key: "meta",      label: "meta"      },
] as const;

export default function TagsIndex() {
  const [category, setCategory] = useState<typeof CATS[number]["key"]>("general");
  const [items, setItems] = useState<TagCardT[] | null>(null);
  const [sort] = useState<Sort>("posts");

  useEffect(() => {
    setItems(null);
    const fetcher = category === "copyright" ? discovery.anime
                  : category === "character" ? discovery.characters
                  : category === "artist"    ? discovery.artists
                  : discovery.topTags;
    fetcher(sort).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [category, sort]);

  return (
    <main className="flex-1 mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-baseline gap-3 mb-6">
        <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight">
          all <span className="text-sakura">tags</span>
        </h1>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto no-scrollbar border-b border-border-subtle">
        {CATS.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`px-3 sm:px-4 py-2 text-sm font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
              category === c.key
                ? "text-sakura border-b-2 border-sakura -mb-px"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-28 border border-border-subtle" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border-strong p-10 text-center text-text-muted">
          No tags in this category yet.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((t, i) => (
            <Link
              key={t.id}
              href={t.public_path}
              className="px-3 py-1.5 border border-border-strong bg-bg-surface hover:border-sakura hover:bg-sakura/10 transition-all font-mono text-sm fade-in"
              style={{ animationDelay: `${Math.min(i * 15, 400)}ms` }}
            >
              <span className="text-text-primary">{t.name}</span>
              <span className="text-text-muted ml-2 text-xs">{t.post_count}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
