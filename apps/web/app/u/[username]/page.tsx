"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  api, animeList, blog,
  type AnimeListEntry, type BlogPostCard, type PostCard, type Profile,
} from "@/lib/api";
import { PostTile } from "@/components/PostTile";
import { PostGridSkeleton } from "@/components/Skeleton";
import { BadgeRow } from "@/components/BadgeChip";
import { FollowButton } from "@/components/FollowButton";
import { Avatar } from "@/components/Avatar";
import { VerifiedTick } from "@/components/VerifiedTick";
import { AchievementGrid } from "@/components/AchievementGrid";

type Tab = "posts" | "list" | "blog" | "achievements";

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [profile, setProfile] = useState<Profile | null | "missing">(null);
  const [posts, setPosts] = useState<PostCard[] | null>(null);
  const [list, setList] = useState<AnimeListEntry[] | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPostCard[] | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [tab, setTab] = useState<Tab>("posts");

  useEffect(() => {
    setProfile(null); setPosts(null); setList(null); setBlogPosts(null);
    api<{ user: Profile }>(`/api/users/${username}`)
      .then((r) => { setProfile(r.user); setFollowerCount(r.user.follower_count); })
      .catch(() => setProfile("missing"));
    api<{ data: PostCard[] }>(`/api/posts?uploader=${username}`)
      .then((r) => setPosts(r.data))
      .catch(() => setPosts([]));
    animeList.forUser(username).then((r) => setList(r.data)).catch(() => setList([]));
    blog.list(1, 12, username).then((r) => setBlogPosts(r.data)).catch(() => setBlogPosts([]));
  }, [username]);

  if (profile === null) {
    return (
      <main className="flex-1 mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-10">
        <div className="skeleton h-44 sm:h-56 mb-6 border-2 border-border-subtle" />
        <PostGridSkeleton count={12} />
      </main>
    );
  }
  if (profile === "missing") {
    return <main className="flex-1 grid place-items-center text-text-muted font-mono px-4 py-20">user not found</main>;
  }

  const joinedLabel = new Date(profile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short" });
  const earnedAchievements = profile.achievements?.filter((a) => a.earned).length ?? 0;
  const totalAchievements  = profile.achievements?.length ?? 0;

  // Deterministic banner hue from username for users without a real banner.
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) | 0;
  const bannerHue1 = Math.abs(h) % 360;
  const bannerHue2 = (bannerHue1 + 80) % 360;

  return (
    <main className="flex-1">
      {/* ====== HERO / BANNER ====== */}
      <section className="relative border-b-4 border-text-primary">
        <div
          className="h-32 sm:h-48 md:h-56"
          aria-hidden
          style={{
            background:
              `linear-gradient(120deg, hsl(${bannerHue1} 35% 18%) 0%, hsl(${bannerHue2} 45% 14%) 100%)`,
          }}
        />
        <div className="mx-auto max-w-7xl px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 -mt-14 sm:-mt-16 md:-mt-20 pb-4 sm:pb-6">
            {/* Avatar — sits over banner */}
            <div className="border-4 border-text-primary shadow-[6px_6px_0_0_var(--color-sakura)] bg-bg-surface shrink-0">
              <Avatar user={profile} size="xl" className="!rounded-none !border-0" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="font-display font-black text-2xl sm:text-4xl tracking-tight leading-tight text-text-primary">
                  {profile.display_name ?? profile.username}
                  <VerifiedTick verified={profile.is_verified} size="md" />
                </h1>
                <span className="text-text-muted font-mono text-xs sm:text-sm">@{profile.username}</span>
              </div>
              {profile.bio && (
                <p className="mt-2 text-text-secondary max-w-2xl text-sm sm:text-base leading-relaxed line-clamp-3">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Action button — follow or "edit profile" */}
            <div className="shrink-0">
              {profile.is_me ? (
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-mono border-2 border-border-strong text-text-secondary hover:border-sakura hover:text-sakura transition-colors"
                >
                  ⚙ edit profile
                </Link>
              ) : (
                <FollowButton
                  username={profile.username}
                  isFollowing={profile.is_following}
                  onChange={(s) => setFollowerCount(s.follower_count)}
                />
              )}
            </div>
          </div>

          {/* Badges */}
          {profile.badges?.length > 0 && (
            <div className="pb-4 sm:pb-5">
              <BadgeRow badges={profile.badges} />
            </div>
          )}

          {/* Stats bar — neobrutalist row, scrolls horizontally on phone if needed */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 pb-5 sm:pb-6">
            <Stat label="posts"        value={profile.post_count} />
            <Stat label="followers"    value={followerCount} link={`/u/${profile.username}/followers`} />
            <Stat label="following"    value={profile.following_count} link={`/u/${profile.username}/following`} />
            <Stat label="achievements" value={`${earnedAchievements}/${totalAchievements}`} tone="cyber" />
            <Stat label="joined"       value={joinedLabel} className="col-span-2 sm:col-span-1" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8">
        {/* ====== TABS ====== */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar border-b-2 border-border-strong mb-5 sm:mb-6">
          {([
            ["posts",        `Posts (${posts?.length ?? "…"})`],
            ["list",         `Anime list (${list?.length ?? "…"})`],
            ["blog",         `Blog (${blogPosts?.length ?? "…"})`],
            ["achievements", `Achievements (${earnedAchievements}/${totalAchievements})`],
          ] as [Tab, string][]).map(([t, label]) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-mono border-b-4 -mb-[2px] transition-colors ${
                  active
                    ? "border-sakura text-sakura"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ====== TAB CONTENT ====== */}
        {tab === "posts" && (
          posts === null ? <PostGridSkeleton count={12} /> :
          posts.length === 0 ? (
            <Empty>@{profile.username} hasn&apos;t uploaded any fan art yet.</Empty>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2.5">
              {posts.map((p, i) => <PostTile key={p.id} post={p} idx={i} />)}
            </div>
          )
        )}

        {tab === "list" && (
          list === null ? <div className="space-y-2">{Array.from({length: 4}).map((_, i) => <div key={i} className="skeleton h-20" />)}</div> :
          list.length === 0 ? (
            <Empty>@{profile.username} hasn&apos;t added any anime to a list yet.</Empty>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((e) => e.anime && (
                <li key={e.id}>
                  <Link href={e.anime.public_path}
                    className="flex gap-3 p-2.5 border-2 border-text-primary bg-bg-surface hover:border-sakura transition-colors">
                    <div className="size-20 sm:size-24 bg-bg-elevated overflow-hidden border-2 border-border-strong shrink-0">
                      {e.anime.cover_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={e.anime.cover_url} alt={e.anime.title} loading="lazy" className="size-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <div className="font-display font-bold text-sm leading-tight truncate">{e.anime.title}</div>
                      <div className="text-[10px] font-mono text-text-muted">
                        {e.anime.year && <>{e.anime.year}</>}
                        {e.anime.episodes && <> · {e.anime.episodes} ep</>}
                        {e.anime.score > 0 && <span className="text-sakura ml-1">★ {e.anime.score.toFixed(1)}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-auto text-[10px] font-mono">
                        <span className={`px-1.5 py-0.5 border ${statusToneFor(e.status)}`}>
                          {e.status.replace("_", " ")}
                        </span>
                        {e.is_favorite && <span className="text-sakura">♥</span>}
                        {e.user_score && <span className="text-text-secondary">{e.user_score}/10</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "blog" && (
          blogPosts === null ? <div className="space-y-2">{Array.from({length: 3}).map((_, i) => <div key={i} className="skeleton h-24" />)}</div> :
          blogPosts.length === 0 ? (
            <Empty>@{profile.username} hasn&apos;t published any blog posts yet.</Empty>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {blogPosts.map((p) => (
                <li key={p.id}>
                  <Link href={`/blog/${p.slug}`}
                    className="group flex flex-col h-full border-2 border-text-primary bg-bg-surface hover:border-sakura transition-colors">
                    {p.cover_url && (
                      <div className="aspect-[16/9] overflow-hidden border-b-2 border-text-primary">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.cover_url} alt={p.title} loading="lazy" className="size-full object-cover group-hover:scale-[1.02] transition-transform" />
                      </div>
                    )}
                    <div className="p-3 sm:p-4 flex flex-col gap-1.5 flex-1">
                      <h3 className="font-display font-bold text-base leading-tight group-hover:text-sakura line-clamp-2">{p.title}</h3>
                      <p className="text-xs text-text-secondary line-clamp-2">{p.excerpt}</p>
                      <div className="text-[10px] font-mono text-text-muted mt-auto">
                        {p.published_at && new Date(p.published_at).toLocaleDateString()} · {p.view_count} reads
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "achievements" && (
          profile.achievements?.length ? (
            <AchievementGrid items={profile.achievements} />
          ) : (
            <Empty>No achievement data yet.</Empty>
          )
        )}
      </div>
    </main>
  );
}

function Stat({
  label, value, link, tone, className = "",
}: {
  label: string; value: number | string; link?: string; tone?: "cyber"; className?: string;
}) {
  const inner = (
    <div className={`border-2 ${tone === "cyber" ? "border-cyber/40" : "border-border-strong"} bg-bg-surface px-3 py-2 ${className}`}>
      <div className={`text-lg sm:text-xl font-display font-black ${tone === "cyber" ? "text-cyber" : "text-text-primary"}`}>{value}</div>
      <div className="text-[10px] sm:text-xs text-text-muted uppercase tracking-[0.18em]">{label}</div>
    </div>
  );
  return link ? <Link href={link} className="hover:[&>div]:border-sakura transition-colors">{inner}</Link> : inner;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-2 border-dashed border-border-strong p-8 sm:p-10 text-center text-text-muted text-sm">
      {children}
    </div>
  );
}

function statusToneFor(s: string): string {
  return s === "watching" ? "border-matcha/40 text-matcha"
       : s === "completed" ? "border-sakura/40 text-sakura"
       : s === "planning"  ? "border-cyber/40 text-cyber"
       : s === "on_hold"   ? "border-peach/40 text-peach"
       :                     "border-border-strong text-text-muted";
}
