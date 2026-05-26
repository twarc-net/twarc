"use client";

import Image from "next/image";
import Link from "next/link";
import type { TagCard as TagCardT } from "@/lib/api";

/**
 * Anime card with neobrutalist chrome: thick border, hard shadow, score/rank
 * badges, stat stripe.
 *
 * Cover image goes through next/image so each viewport gets an appropriately-
 * sized variant (mobile won't download the 600×800 source for a 150-px slot).
 */
export function AnimeTagCard({ tag, idx = 0 }: { tag: TagCardT; idx?: number }) {
  const cover = tag.cover_url ?? tag.cover_thumb;
  const display = tag.name.replace(/_/g, " ");

  return (
    <Link
      href={tag.public_path}
      className="group block relative border-2 border-text-primary bg-bg-surface shadow-[3px_3px_0_0_var(--color-sakura)] sm:shadow-[5px_5px_0_0_var(--color-sakura)] sm:hover:shadow-[8px_8px_0_0_var(--color-sakura)] sm:hover:-translate-x-[3px] sm:hover:-translate-y-[3px] transition-all duration-200 fade-in"
      style={{ animationDelay: `${Math.min(idx * 30, 450)}ms` }}
    >
      <div className="aspect-[2/3] bg-bg-elevated overflow-hidden relative">
        {cover ? (
          <Image
            src={cover}
            alt={display}
            fill
            // Mobile shows 2 cols (~50vw each); sm 3 cols (~33vw); md 4 cols
            // (~25vw); lg 5 cols (~20vw); xl 6 cols (~16vw).
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading={idx < 6 ? "eager" : "lazy"}
            placeholder="empty"
          />
        ) : (
          <div className="size-full grid place-items-center font-display font-black text-7xl text-text-primary/15 select-none">
            {display.charAt(0).toUpperCase()}
          </div>
        )}

        {/* MAL rank badge — top-left, only for ranked */}
        {tag.mal_rank && tag.mal_rank <= 100 && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-cyber text-bg-base text-[10px] font-mono font-bold tracking-tight z-10">
            #{tag.mal_rank}
          </div>
        )}

        {/* Score badge — top-right */}
        {tag.score && tag.score > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-sakura text-bg-base text-[10px] font-mono font-bold z-10">
            ★ {tag.score.toFixed(1)}
          </div>
        )}

        {/* Title at bottom */}
        <div className="absolute inset-x-0 bottom-0 p-2 sm:p-2.5 bg-gradient-to-t from-bg-base via-bg-base/85 to-transparent z-10">
          <div className="font-display font-black text-xs sm:text-sm md:text-base text-text-primary leading-tight line-clamp-2 group-hover:text-sakura transition-colors">
            {display}
          </div>
        </div>
      </div>

      {/* Stat stripe */}
      <div className="border-t-2 border-text-primary px-2 sm:px-2.5 py-1 sm:py-1.5 flex items-center gap-2 sm:gap-3 text-[10px] font-mono text-text-muted">
        {tag.year_start && <span className="text-text-secondary">{tag.year_start}</span>}
        {tag.episodes && <span>{tag.episodes} ep</span>}
        {tag.post_count > 0 && <span className="ml-auto text-sakura">▤ {tag.post_count}</span>}
      </div>
    </Link>
  );
}
