"use client";

import Link from "next/link";
import { useState } from "react";
import type { TagCard as TagCardT } from "@/lib/api";

const CAT_LABEL: Record<string, string> = {
  copyright: "anime",
  character: "character",
  artist: "artist",
  general: "tag",
  meta: "meta",
};

/** Generate a deterministic pastel gradient from a tag name when no cover. */
function gradientFromName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const hue1 = Math.abs(h) % 360;
  const hue2 = (hue1 + 60) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 50% 30%) 0%, hsl(${hue2} 60% 20%) 100%)`;
}

export function TagCard({ tag, idx = 0, variant = "card" }: { tag: TagCardT; idx?: number; variant?: "card" | "thumb" }) {
  const [loaded, setLoaded] = useState(false);
  const cover = variant === "thumb" ? tag.cover_thumb : tag.cover_url;
  const stats = tag.view_count + tag.fav_total + tag.post_count;

  return (
    <Link
      href={tag.public_path}
      className="group block relative overflow-hidden border-2 border-text-primary shadow-[5px_5px_0_0_var(--color-sakura)] hover:shadow-[8px_8px_0_0_var(--color-sakura)] hover:-translate-x-[3px] hover:-translate-y-[3px] transition-all duration-200 fade-in bg-bg-surface"
      style={{ animationDelay: `${Math.min(idx * 35, 500)}ms` }}
    >
      <div className="aspect-[2/3] relative overflow-hidden" style={!cover ? { background: gradientFromName(tag.name) } : undefined}>
        {cover ? (
          <>
            {!loaded && <div className="absolute inset-0 skeleton" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={tag.name}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              className={`size-full object-cover transition-transform duration-500 group-hover:scale-105 ${loaded ? "img-fade" : "opacity-0"}`}
            />
          </>
        ) : (
          <div className="size-full grid place-items-center">
            <span className="font-display font-black text-6xl text-text-primary/20 select-none">
              {tag.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Category chip — top-left */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-bg-base/85 backdrop-blur-sm border border-border-strong text-[10px] font-mono uppercase tracking-[0.15em] text-text-secondary">
          {CAT_LABEL[tag.category] ?? tag.category}
        </div>

        {/* Title + stats — bottom strip */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-bg-base/95 via-bg-base/70 to-transparent">
          <div className="font-display font-black text-text-primary text-sm sm:text-base leading-tight tracking-tight line-clamp-2 group-hover:text-sakura transition-colors">
            {tag.name.replace(/_/g, " ")}
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-text-muted mt-1">
            <span title="posts">▤ {tag.post_count}</span>
            <span title="views">⊙ {tag.view_count}</span>
            {tag.fav_total > 0 && <span title="favs" className="text-sakura">♥ {tag.fav_total}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
