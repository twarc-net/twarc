"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { admin } from "@/lib/api";

type Stats = {
  pending_posts: number;
  flagged_posts: number;
  active_posts: number;
  total_users: number;
  open_reports: number;
};

export default function AdminHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    admin.stats().then(setStats).catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight">
          staff <span className="text-cyber">overview</span>
        </h1>
        <p className="text-text-secondary mt-1 text-sm">
          Approve, manage, curate. Everything new arrives in the mod queue first.
        </p>
      </div>

      {err && <div className="text-sakura font-mono text-sm">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="pending review" value={stats?.pending_posts ?? "—"} accent="cyber" href="/admin/moderate" />
        <StatCard label="active posts"   value={stats?.active_posts ?? "—"} />
        <StatCard label="flagged"        value={stats?.flagged_posts ?? "—"} accent="peach" />
        <StatCard label="total users"    value={stats?.total_users ?? "—"} href="/admin/users" />
        <StatCard label="open reports"   value={stats?.open_reports ?? "—"} accent="sakura" />
      </div>

      <div className="border border-border-subtle bg-bg-surface p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-text-muted font-mono mb-2">
          quick actions
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/moderate" className="btn-brut !text-sm !py-2 !px-3 !bg-cyber !shadow-[var(--shadow-brut-cyber)]">
            review queue →
          </Link>
          <Link href="/admin/tags" className="btn-ghost !text-sm !py-2 !px-3">
            create anime / character tags
          </Link>
          <Link href="/admin/users" className="btn-ghost !text-sm !py-2 !px-3">
            manage users
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, accent, href,
}: {
  label: string;
  value: number | string;
  accent?: "cyber" | "sakura" | "peach";
  href?: string;
}) {
  const accentClass =
    accent === "cyber"  ? "border-cyber  text-cyber"  :
    accent === "sakura" ? "border-sakura text-sakura" :
    accent === "peach"  ? "border-peach  text-peach"  :
    "border-border-subtle text-text-primary";

  const inner = (
    <div className={`border ${accentClass} bg-bg-surface px-4 py-3 hover:bg-bg-elevated transition-colors`}>
      <div className="text-xs uppercase tracking-[0.18em] text-text-muted font-mono">{label}</div>
      <div className={`text-2xl font-display font-black mt-1 ${accent ? "" : "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
