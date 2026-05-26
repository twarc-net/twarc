"use client";

import Link from "next/link";
import { useState } from "react";
import type { PostCard } from "@/lib/api";

/**
 * Grid tile for a single post.
 *
 * Uses a uniform 3:4 aspect ratio so the grid is predictable on mobile —
 * a per-post natural aspect created a jagged mosaic that read as "broken"
 * on small screens. `object-cover` crops thumbs to fit; the full image is
 * always one tap away on the detail page.
 *
 * The stats footer is always visible (no hover dependency) so mobile users
 * can see score / favs / tag count without long-pressing.
 */
export function PostTile({ post, idx = 0 }: { post: PostCard; idx?: number }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Link
      href={`/post/${post.id}`}
      className="group block border border-border-subtle hover:border-sakura transition-colors fade-in bg-bg-surface"
      style={{ animationDelay: `${Math.min(idx * 25, 400)}ms` }}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-bg-elevated">
        {!loaded && <div className="absolute inset-0 skeleton" aria-hidden />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.thumb_url}
          alt={`twarc post ${post.id}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
            loaded ? "img-fade" : "opacity-0"
          }`}
        />
        {post.rating === "questionable" && (
          <span className="absolute top-1 right-1 text-[9px] font-mono uppercase tracking-wide px-1 py-0.5 bg-peach/90 text-bg-base">
            Q
          </span>
        )}
      </div>
      {/* Always-visible stats — mobile-friendly, no hover needed. */}
      <div className="px-2 py-1 flex items-center gap-2.5 text-[10px] font-mono text-text-muted border-t border-border-subtle">
        <span className="flex items-center gap-1" title="score"><span className="text-sakura">★</span> {post.score}</span>
        <span className="flex items-center gap-1" title="favs"><span className="text-sakura">♥</span> {post.fav_count}</span>
        <span className="ml-auto" title="tags">#{post.tag_count}</span>
      </div>
    </Link>
  );
}
