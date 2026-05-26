"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { discovery, type TagDetailFull } from "@/lib/api";
import { PostTile } from "@/components/PostTile";
import { PostGridSkeleton } from "@/components/Skeleton";
import { AnimeListButton } from "@/components/AnimeListButton";
import { StreamingLinks } from "@/components/StreamingLinks";

const KIND_LABEL: Record<string, string> = {
  anime: "anime",
  characters: "character",
  tag: "tag",
};

export function TagDetailView({ kind, name }: { kind: "anime" | "characters" | "tag"; name: string }) {
  const [data, setData] = useState<TagDetailFull | null | "missing">(null);
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    setHeroLoaded(false);
    discovery.tagDetail(kind, name).then(setData).catch(() => setData("missing"));
  }, [kind, name]);

  if (data === null) {
    return (
      <main className="flex-1 mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8">
        <div className="skeleton h-40 sm:h-64 mb-6 sm:mb-8" />
        <PostGridSkeleton count={12} />
      </main>
    );
  }
  if (data === "missing") {
    return <main className="flex-1 grid place-items-center text-text-muted font-mono px-4 py-20">not found</main>;
  }

  const { tag, anime_info: anime, character_info: char, characters, appears_in, posts, meta } = data;
  const hero = tag.cover_hero ?? tag.cover_url;
  const displayTitle = (kind === "anime" ? anime?.title_english : char?.name_english) || tag.name.replace(/_/g, " ");

  return (
    <main className="flex-1">
      {/* HERO */}
      <section className="relative overflow-hidden border-b-4 border-text-primary">
        {hero && (
          <div className="absolute inset-0">
            {!heroLoaded && <div className="absolute inset-0 skeleton" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt="" onLoad={() => setHeroLoaded(true)}
              className={`size-full object-cover ${heroLoaded ? "img-fade" : "opacity-0"}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/85 to-bg-base/40" />
          </div>
        )}
        <div className="relative mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-12 md:py-20">
          <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr] md:grid-cols-[200px_1fr] gap-3 sm:gap-6 md:gap-8 items-start">
            {hero && (
              <div className="">
                <div className="border-2 sm:border-4 border-text-primary shadow-[5px_5px_0_0_var(--color-sakura)] sm:shadow-[8px_8px_0_0_var(--color-sakura)] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hero} alt={displayTitle} className="w-full aspect-[3/4] object-cover" />
                </div>
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] text-text-muted mb-1.5 sm:mb-2 break-words">
                {KIND_LABEL[kind]}
                {anime?.year_start && <> · {anime.year_start}</>}
                {anime?.status && <span className="hidden sm:inline"> · {anime.status}</span>}
              </div>
              <h1 className="font-display font-black text-2xl sm:text-4xl md:text-6xl tracking-tight leading-[1.02] mb-1.5 sm:mb-2 text-text-primary break-words">
                {displayTitle}
              </h1>
              {anime?.title_japanese && (
                <div className="font-jp text-sm sm:text-lg text-text-muted mb-2 sm:mb-3 truncate">{anime.title_japanese}</div>
              )}
              {char?.name_japanese && (
                <div className="font-jp text-sm sm:text-lg text-text-muted mb-2 sm:mb-3 truncate">{char.name_japanese}</div>
              )}

              {anime && (
                <>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mb-3 sm:mb-4">
                    {anime.score > 0 && <Stat tone="sakura" label="score">★ {anime.score.toFixed(2)}</Stat>}
                    {anime.mal_rank && <Stat tone="cyber" label="rank">#{anime.mal_rank}</Stat>}
                    {anime.episodes && <Stat label="ep">{anime.episodes}</Stat>}
                    {anime.media_type && <Stat label="type">{anime.media_type}</Stat>}
                  </div>
                </>
              )}
              {char && char.favorites_count && (
                <div className="flex flex-wrap items-center gap-3 mb-3 sm:mb-4">
                  <Stat tone="sakura" label="favorites">♥ {char.favorites_count.toLocaleString()}</Stat>
                </div>
              )}

              {(anime?.genres?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
                  {anime!.genres.map((g) => (
                    <Link key={g} href={`/anime?genre=${encodeURIComponent(g)}`}
                      className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-mono border-2 border-sakura/40 text-sakura active:bg-sakura active:text-bg-base hover:bg-sakura hover:text-bg-base transition-colors">
                      {g}
                    </Link>
                  ))}
                  {anime!.themes?.slice(0, 6).map((g) => (
                    <span key={g} className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-mono border-2 border-border-strong text-text-muted">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {anime?.synopsis && (
                <p className="text-text-secondary text-sm sm:text-base max-w-3xl leading-relaxed line-clamp-4 sm:line-clamp-6 mb-3 sm:mb-4 col-span-full">
                  {anime.synopsis}
                </p>
              )}
              {tag.description && !anime && (
                <p className="text-text-secondary text-sm sm:text-base max-w-3xl leading-relaxed mb-4">
                  {tag.description}
                </p>
              )}

              {anime && (
                <dl className="hidden sm:grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs font-mono text-text-muted max-w-2xl">
                  {anime.studios && <KV k="studios" v={anime.studios} />}
                  {anime.source  && <KV k="source"  v={anime.source} />}
                  {anime.season  && <KV k="season"  v={`${anime.season} ${anime.year_start ?? ""}`} />}
                  {anime.aired_from && <KV k="aired" v={`${anime.aired_from}${anime.aired_to ? " → " + anime.aired_to : ""}`} />}
                  {anime.duration_min && <KV k="duration" v={`${anime.duration_min} min/ep`} />}
                  {(anime.demographics?.length ?? 0) > 0 && <KV k="audience" v={anime.demographics!.join(", ")} />}
                </dl>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Add-to-list, favorite + streaming buttons. All sit OUTSIDE the
          overflow-hidden hero so the watchlist dropdown isn't clipped. */}
      {anime && (
        <section className="mx-auto max-w-7xl px-3 sm:px-4 pt-4 sm:pt-5">
          <AnimeListButton animeName={tag.name} />
          {anime.streaming_links?.length > 0 && (
            <StreamingLinks links={anime.streaming_links} />
          )}
        </section>
      )}

      {/* CHARACTERS — anime detail only */}
      {kind === "anime" && characters.length > 0 && (
        <section className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8">
          <h2 className="font-display font-black text-xl sm:text-3xl tracking-tight mb-3 sm:mb-4">
            <span className="text-sakura">characters</span>
            <span className="ml-2 text-xs sm:text-sm font-mono text-text-muted">{characters.length}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {characters.map((c, i) => (
              <Link key={c.id} href={c.public_path}
                className="group border-2 border-text-primary bg-bg-surface fade-in flex flex-col"
                style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                <div className="aspect-[3/4] overflow-hidden bg-bg-elevated">
                  {c.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={c.image_url} alt={c.display_name} loading="lazy"
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="size-full grid place-items-center font-display font-black text-5xl text-text-muted/30">
                      {c.display_name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-2 sm:p-2.5 border-t-2 border-text-primary">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">{c.role ?? "—"}</div>
                  <div className="font-display font-bold text-xs sm:text-sm leading-tight group-hover:text-sakura transition-colors truncate">
                    {c.display_name}
                  </div>
                  {c.favorites_count > 0 && (
                    <div className="text-[10px] font-mono text-sakura mt-0.5">♥ {c.favorites_count.toLocaleString()}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* APPEARS IN — character detail: small inline chips so the page's
          primary visual focus is the user-uploaded fan art below. */}
      {kind === "characters" && appears_in.length > 0 && (
        <section className="mx-auto max-w-7xl px-3 sm:px-4 pt-2 pb-4 sm:pb-6">
          <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
            appears in
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {appears_in.map((a) => (
              <Link key={a.id} href={a.public_path}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-mono border-2 border-border-strong text-text-secondary hover:border-sakura hover:text-sakura active:border-sakura active:text-sakura transition-colors">
                <span className="truncate max-w-[200px] sm:max-w-none">{a.display_name}</span>
                {a.role === "Main" && <span className="text-sakura">★</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAN ART — the primary content on character pages. Encourages uploads. */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex items-baseline justify-between mb-3 sm:mb-4 gap-2 flex-wrap">
          <h2 className="font-display font-black text-xl sm:text-3xl tracking-tight">
            {kind === "characters" ? "images" : "fan art"}
            <span className="ml-2 text-text-muted text-xs sm:text-sm font-mono">{meta.total_posts}</span>
          </h2>
          <div className="flex gap-1.5 sm:gap-2">
            <Link href={`/dashboard/upload?character=${encodeURIComponent(tag.name)}`}
              className="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-mono border-2 border-sakura text-sakura active:bg-sakura active:text-bg-base hover:bg-sakura hover:text-bg-base transition-colors">
              + upload
            </Link>
            <Link href={`/browse?tags=${encodeURIComponent(tag.name)}`}
              className="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-mono border-2 border-border-strong text-text-muted hover:border-sakura hover:text-sakura transition-colors">
              see all →
            </Link>
          </div>
        </div>
        {posts.length === 0 ? (
          <div className="border-2 border-dashed border-border-strong p-6 sm:p-10 text-center">
            <p className="text-text-secondary mb-3 text-sm sm:text-base">
              No {kind === "characters" ? "fan art" : "posts"} of <span className="font-mono text-sakura">{tag.name.replace(/_/g, " ")}</span> yet.
            </p>
            <Link href={`/dashboard/upload?character=${encodeURIComponent(tag.name)}`}
              className="btn-brut !text-xs !py-2 !px-4">
              be the first to upload →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2.5">
            {posts.map((p, i) => <PostTile key={p.id} post={p} idx={i} />)}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ children, label, tone }: { children: React.ReactNode; label: string; tone?: "sakura" | "cyber" }) {
  const color = tone === "sakura" ? "text-sakura border-sakura"
              : tone === "cyber"  ? "text-cyber border-cyber"
              :                     "text-text-primary border-border-strong";
  return (
    <div className={`px-2 sm:px-3 py-1 sm:py-1.5 border-2 font-mono text-[11px] sm:text-sm ${color}`}>
      <span className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-70 mr-1.5 sm:mr-2">{label}</span>
      <span className="font-display font-bold">{children}</span>
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="uppercase tracking-wider text-text-muted shrink-0">{k}</dt>
      <dd className="text-text-secondary truncate">{v}</dd>
    </div>
  );
}
