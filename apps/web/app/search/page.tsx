"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { discovery, type PostCard, type TagCard as TagCardT, type SearchUserHit } from "@/lib/api";
import { TagCard } from "@/components/TagCard";
import { PostTile } from "@/components/PostTile";

type Results = {
  tags: TagCardT[];
  posts: PostCard[];
  users: SearchUserHit[];
};

function SearchInner() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";

  const [data, setData] = useState<Results | null>(null);

  useEffect(() => {
    if (!q) { setData({ tags: [], posts: [], users: [] }); return; }
    setData(null);
    discovery.search(q).then(setData).catch(() => setData({ tags: [], posts: [], users: [] }));
  }, [q]);

  return (
    <main className="flex-1 mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight mb-2">
        search
      </h1>
      <p className="text-text-secondary font-mono text-sm mb-8">
        {q ? <>results for <span className="text-sakura">{q}</span></> : "type a query in the top bar to begin"}
      </p>

      {!q ? null : data === null ? (
        <div className="text-text-muted font-mono text-sm">searching…</div>
      ) : (
        <div className="flex flex-col gap-10">
          {/* Tags */}
          <Section title="tags" count={data.tags.length}>
            {data.tags.length === 0 ? <Empty label={`no tags matching "${q}"`} /> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {data.tags.map((t, i) => <TagCard key={t.id} tag={t} idx={i} />)}
              </div>
            )}
          </Section>

          {/* Users */}
          <Section title="users" count={data.users.length}>
            {data.users.length === 0 ? <Empty label={`no users matching "${q}"`} /> : (
              <div className="flex flex-wrap gap-2">
                {data.users.map((u, i) => (
                  <Link
                    key={u.id}
                    href={`/u/${u.username}`}
                    className="flex items-center gap-3 px-3 py-2 border border-border-subtle hover:border-sakura bg-bg-surface transition-colors fade-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <span className="size-7 rounded-full bg-sakura/30 grid place-items-center text-xs font-bold text-sakura">
                      {(u.display_name ?? u.username).charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <span className="text-text-primary font-mono text-sm">@{u.username}</span>
                      {u.display_name && (
                        <span className="text-text-muted text-xs ml-2">{u.display_name}</span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          {/* Posts */}
          <Section title="posts" count={data.posts.length}>
            {data.posts.length === 0 ? <Empty label={`no posts matching "${q}"`} /> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {data.posts.map((p, i) => <PostTile key={p.id} post={p} idx={i} />)}
              </div>
            )}
          </Section>
        </div>
      )}
    </main>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight mb-3">
        {title} <span className="text-text-muted text-sm font-mono">· {count}</span>
      </h2>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-text-muted text-sm font-mono">{label}</div>;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="flex-1 p-8 text-text-muted font-mono">loading…</main>}>
      <SearchInner />
    </Suspense>
  );
}
