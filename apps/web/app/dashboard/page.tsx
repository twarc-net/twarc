"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { posts } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Stats = {
  posts_total: number;
  posts_active: number;
  favs_received: number;
  score_total: number;
  followers: number;
  following: number;
};

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    posts.myStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display font-black text-4xl tracking-tight">
          welcome, <span className="text-sakura">{user?.display_name ?? user?.username}</span>
        </h1>
        <p className="text-text-secondary mt-1">
          Your creator dashboard. Upload, manage, grow.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="posts" value={stats?.posts_total ?? "—"} />
        <StatCard label="active" value={stats?.posts_active ?? "—"} />
        <StatCard label="favs received" value={stats?.favs_received ?? "—"} accent />
        <StatCard label="total score" value={stats?.score_total ?? "—"} />
        <StatCard label="followers" value={stats?.followers ?? "—"} />
        <StatCard label="following" value={stats?.following ?? "—"} />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/upload" className="btn-brut">
          upload new →
        </Link>
        <Link href="/dashboard/blog/new" className="btn-brut btn-brut-cyber">
          write blog post →
        </Link>
        <Link href="/dashboard/posts" className="btn-ghost">
          view all posts
        </Link>
        <Link href="/dashboard/list" className="btn-ghost">
          my anime list
        </Link>
      </div>

      {/* Tips card */}
      <div className="border border-border-subtle bg-bg-surface p-5 mt-4">
        <div className="text-xs uppercase tracking-[0.2em] text-text-muted font-mono mb-2">
          getting started
        </div>
        <ul className="text-sm text-text-secondary space-y-1.5 list-inside list-disc marker:text-sakura">
          <li>Use space-separated tags like <code className="font-mono text-cyber">hatsune_miku twintails original_character</code></li>
          <li>Tag aliases work — type <code className="font-mono text-cyber">miku</code> and it normalizes to <code className="font-mono text-cyber">hatsune_miku</code></li>
          <li>Set the rating honestly. <code className="font-mono text-peach">questionable</code> is hidden by default for new visitors.</li>
          <li>Hand-drawn only. AI-generated art will be removed by mods.</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`border ${accent ? "border-sakura" : "border-border-subtle"} bg-bg-surface px-4 py-3`}>
      <div className="text-xs uppercase tracking-[0.18em] text-text-muted font-mono">{label}</div>
      <div className={`text-2xl font-display font-black mt-1 ${accent ? "text-sakura" : "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}
