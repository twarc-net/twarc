"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { discovery, blog, type PostCard, type TagCard as TagCardT, type BlogPostCard } from "@/lib/api";
import { AnimeTagCard } from "@/components/AnimeTagCard";
import { CharacterTagCard } from "@/components/CharacterTagCard";
import { PostTile } from "@/components/PostTile";
import { SectionHeader } from "@/components/SectionHeader";

type HomeData = {
  anime: TagCardT[];
  characters: TagCardT[];
  tags: TagCardT[];
  posts: PostCard[];
};

export default function Home() {
  const [data, setData] = useState<HomeData | null>(null);
  const [topAnime, setTopAnime] = useState<TagCardT[] | null>(null);
  const [topCharacters, setTopCharacters] = useState<TagCardT[] | null>(null);
  const [latestBlog, setLatestBlog] = useState<BlogPostCard[] | null>(null);

  useEffect(() => {
    discovery.home().then(setData).catch(() => setData({ anime: [], characters: [], tags: [], posts: [] }));
    discovery.anime("score",      { per_page: 18 }).then((r) => setTopAnime(r.data)).catch(() => setTopAnime([]));
    discovery.characters("favs",  { per_page: 12 }).then((r) => setTopCharacters(r.data)).catch(() => setTopCharacters([]));
    blog.list(1, 6).then((r) => setLatestBlog(r.data)).catch(() => setLatestBlog([]));
  }, []);

  return (
    <main className="flex-1">
      {/* ============ TOP-RATED ANIME (now the lead section) ============ */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4 pt-6 sm:pt-10 pb-8 sm:pb-12">
        <SectionHeader accent="top-rated" title="anime" href="/anime?sort=score" label="all anime" />
        {topAnime === null ? (
          <PortraitSkeletonGrid count={12} />
        ) : topAnime.length === 0 ? (
          <EmptyHint label="Anime catalog is loading…" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {topAnime.slice(0, 12).map((t, i) => <AnimeTagCard key={t.id} tag={t} idx={i} />)}
          </div>
        )}
      </section>

      {/* ============ MOST-LOVED CHARACTERS ============ */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4 py-8 sm:py-12 border-t-4 border-text-primary">
        <SectionHeader accent="most loved" title="characters" href="/characters" label="all characters" />
        {topCharacters === null ? (
          <PortraitSkeletonGrid count={12} />
        ) : topCharacters.length === 0 ? (
          <EmptyHint label="Character catalog is loading…" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {topCharacters.slice(0, 12).map((t, i) => <CharacterTagCard key={t.id} tag={t} idx={i} />)}
          </div>
        )}
      </section>

      {/* ============ LATEST BLOG ============ */}
      {latestBlog !== null && latestBlog.length > 0 && (
        <section className="mx-auto max-w-7xl px-3 sm:px-4 py-8 sm:py-12 border-t-4 border-text-primary">
          <SectionHeader accent="from the" title="blog" href="/blog" label="all posts" />
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {latestBlog.slice(0, 6).map((p, i) => (
              <li key={p.id} className="fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col h-full border-2 border-text-primary bg-bg-surface shadow-[5px_5px_0_0_var(--color-cyber)] hover:shadow-[8px_8px_0_0_var(--color-cyber)] active:shadow-[3px_3px_0_0_var(--color-cyber)] hover:-translate-x-[3px] hover:-translate-y-[3px] transition-all duration-200"
                >
                  {p.cover_url && (
                    <div className="aspect-[16/9] overflow-hidden border-b-2 border-text-primary">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.cover_url} alt={p.title} loading="lazy"
                        className="size-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
                    <h3 className="font-display font-bold text-base sm:text-lg leading-tight group-hover:text-sakura transition-colors line-clamp-2">
                      {p.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary line-clamp-2 flex-1">{p.excerpt}</p>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                      {p.author && <>@{p.author.username}</>}
                      {p.published_at && <> · {new Date(p.published_at).toLocaleDateString()}</>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============ LATEST FAN ART ============ */}
      {data && data.posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-3 sm:px-4 py-8 sm:py-12 border-t-4 border-text-primary">
          <SectionHeader accent="latest" title="fan art" href="/browse" label="see all" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2.5">
            {data.posts.slice(0, 18).map((p, i) => <PostTile key={p.id} post={p} idx={i} />)}
          </div>
        </section>
      )}

      {/* ============ FOOTER ============ */}
      <footer className="border-t-4 border-text-primary mt-10">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-baseline justify-between text-xs text-text-muted font-mono">
          <span>
            <span className="text-sakura font-display font-black">twarc</span> · The World of Anime, Rated &amp; Curated
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/about"   className="hover:text-sakura transition-colors">About</Link>
            <Link href="/terms"   className="hover:text-sakura transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-sakura transition-colors">Privacy</Link>
            <Link href="/blog"    className="hover:text-sakura transition-colors">Blog</Link>
            <span className="text-text-muted/70">© {new Date().getFullYear()} twarc.net</span>
          </span>
        </div>
      </footer>
    </main>
  );
}

function PortraitSkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton aspect-[2/3] border-2 border-border-subtle" />
      ))}
    </div>
  );
}

function EmptyHint({ label, cta }: { label: string; cta?: { href: string; label: string } }) {
  return (
    <div className="border-2 border-dashed border-border-strong p-6 sm:p-8 text-center text-sm text-text-muted">
      {label}
      {cta && (
        <div className="mt-3">
          <Link href={cta.href} className="btn-brut !text-xs !py-1.5 !px-3">{cta.label}</Link>
        </div>
      )}
    </div>
  );
}
