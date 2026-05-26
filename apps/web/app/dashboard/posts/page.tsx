"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { posts, postsDelete, type PostCard } from "@/lib/api";
import { PostTile } from "@/components/PostTile";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function MyPostsPage() {
  const [items, setItems] = useState<PostCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [delTarget, setDelTarget] = useState<PostCard | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    posts.myList().then((r) => { setItems(r.data); setTotal(r.meta.total); }).catch(() => setItems([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = async () => {
    if (!delTarget) return;
    setBusy(true);
    try {
      await postsDelete(delTarget.id);
      setDelTarget(null);
      load();
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display font-black text-3xl tracking-tight">
          my <span className="text-sakura">posts</span>
        </h1>
        <div className="text-sm font-mono text-text-muted">{total} total</div>
      </div>

      {items === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4] border border-border-subtle" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-border-subtle bg-bg-surface p-10 text-center">
          <div className="text-text-secondary mb-3">No posts yet.</div>
          <Link href="/dashboard/upload" className="btn-brut">upload your first →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {items.map((p, idx) => (
            <div key={p.id} className="relative group">
              <PostTile post={p} idx={idx} />
              <button
                onClick={(e) => { e.preventDefault(); setDelTarget(p); }}
                className="absolute top-1 left-1 size-7 grid place-items-center bg-bg-base/80 backdrop-blur border border-border-subtle text-sakura opacity-0 group-hover:opacity-100 hover:bg-sakura hover:text-bg-base transition-all"
                title="Delete post"
                aria-label="Delete post"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={delTarget !== null}
        title="Delete this post?"
        message="The post and its files will be removed. This is reversible by an admin within 30 days, then permanent."
        confirmLabel="delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}
