"use client";

import Image from "next/image";
import Link from "next/link";
import type { TagCard as TagCardT } from "@/lib/api";

/**
 * Character card. Image routed through next/image so mobile downloads a
 * thumbnail instead of MAL's full-resolution portrait.
 */
export function CharacterTagCard({ tag, idx = 0 }: { tag: TagCardT; idx?: number }) {
  const cover = tag.cover_url ?? tag.cover_thumb;
  const display = tag.display_name ?? tag.name.replace(/_/g, " ");

  return (
    <Link
      href={tag.public_path}
      className="group block border-2 border-text-primary bg-bg-surface shadow-[3px_3px_0_0_var(--color-cyber)] sm:shadow-[5px_5px_0_0_var(--color-cyber)] sm:hover:shadow-[8px_8px_0_0_var(--color-cyber)] sm:hover:-translate-x-[3px] sm:hover:-translate-y-[3px] transition-all duration-200 fade-in"
      style={{ animationDelay: `${Math.min(idx * 30, 450)}ms` }}
    >
      <div className="aspect-[3/4] bg-bg-elevated overflow-hidden relative">
        {cover ? (
          <Image
            src={cover}
            alt={display}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 16vw, 16vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading={idx < 6 ? "eager" : "lazy"}
            placeholder="empty"
          />
        ) : (
          <div className="size-full grid place-items-center font-display font-black text-7xl text-text-primary/15 select-none">
            {display.charAt(0).toUpperCase()}
          </div>
        )}
        {(tag.favorites_count ?? 0) > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-sakura text-bg-base text-[10px] font-mono font-bold z-10">
            ♥ {(tag.favorites_count ?? 0).toLocaleString()}
          </div>
        )}
      </div>
      <div className="border-t-2 border-text-primary px-2 sm:px-2.5 py-1 sm:py-1.5">
        <div className="font-display font-bold text-xs sm:text-sm leading-tight group-hover:text-sakura transition-colors truncate">
          {display}
        </div>
      </div>
    </Link>
  );
}
