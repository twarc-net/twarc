"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { blog, type BlogPostCard } from "@/lib/api";

export default function MyBlogPage() {
  const [items, setItems] = useState<BlogPostCard[] | null>(null);

  useEffect(() => {
    blog.mine().then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-black text-3xl tracking-tight">my <span className="text-sakura">blog posts</span></h1>
          <p className="text-text-secondary text-sm mt-1">Drafts, pending review, and published posts.</p>
        </div>
        <Link href="/dashboard/blog/new" className="btn-brut !text-sm !py-2 !px-4">+ new post</Link>
      </div>

      {items === null ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border-strong p-10 text-center text-text-muted">
          You haven&apos;t written any blog posts yet. <Link href="/dashboard/blog/new" className="text-sakura hover:underline">Write your first →</Link>
        </div>
      ) : (
        <ul className="border border-border-subtle divide-y divide-border-subtle">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3 sm:p-4 hover:bg-bg-surface transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={p.status === "published" ? `/blog/${p.slug}` : "#"} className="font-display font-bold text-base truncate hover:text-sakura">
                    {p.title}
                  </Link>
                  <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border ${
                    p.status === "published" ? "border-matcha/40 text-matcha" :
                    p.status === "pending"   ? "border-peach/40 text-peach"    :
                                               "border-border-strong text-text-muted"
                  }`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-text-muted font-mono mt-0.5 truncate">
                  {p.view_count} reads · updated {new Date(p.updated_at).toLocaleDateString()}
                </p>
              </div>
              <Link href={`/dashboard/blog/${p.id}/edit`} className="text-xs text-cyber hover:underline font-mono shrink-0">edit</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
