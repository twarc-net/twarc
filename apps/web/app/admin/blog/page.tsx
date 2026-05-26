"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminBlog, type BlogPostFull } from "@/lib/api";
import { BlogContent } from "@/components/BlogContent";

/**
 * Admin moderation queue for blog submissions. Member-authored posts arrive
 * in 'pending' status and don't appear on /blog until a mod approves here.
 */
export default function AdminBlogQueuePage() {
  const [items, setItems] = useState<BlogPostFull[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [preview, setPreview] = useState<BlogPostFull | null>(null);

  const load = useCallback(() => {
    setItems(null);
    adminBlog.pending().then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (p: BlogPostFull) => {
    setBusy(p.id);
    try { await adminBlog.approve(p.id); load(); setPreview(null); }
    finally { setBusy(null); }
  };
  const reject = async (p: BlogPostFull) => {
    if (! confirm(`Reject "${p.title}"? The post will be soft-deleted.`)) return;
    setBusy(p.id);
    try { await adminBlog.reject(p.id); load(); setPreview(null); }
    finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight">
          blog <span className="text-cyber">moderation</span>
        </h1>
        <p className="text-text-secondary text-sm mt-1">Pending member-authored blog posts awaiting approval.</p>
      </div>

      {items === null ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed border-border-strong p-10 text-center text-text-muted">
          Inbox zero — no pending blog submissions.
        </div>
      ) : (
        <ul className="border-2 border-border-strong divide-y-2 divide-border-strong">
          {items.map((p) => (
            <li key={p.id} className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 hover:bg-bg-surface/50">
              {p.cover_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.cover_url} alt="" className="size-20 sm:size-24 object-cover border-2 border-border-strong shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-base leading-tight">{p.title}</div>
                <div className="text-xs font-mono text-text-muted mt-0.5">
                  by <Link href={`/u/${p.author.username}`} className="text-cyber hover:underline">@{p.author.username}</Link>
                  {" · "}{new Date(p.created_at).toLocaleString()}
                </div>
                {p.excerpt && <p className="text-sm text-text-secondary mt-1.5 line-clamp-2">{p.excerpt}</p>}
              </div>
              <div className="flex gap-1.5 sm:flex-col sm:gap-2 shrink-0">
                <button
                  onClick={() => setPreview(p)}
                  disabled={busy === p.id}
                  className="px-3 py-1.5 text-xs font-mono border-2 border-border-strong text-text-secondary hover:border-cyber hover:text-cyber transition-colors"
                >
                  preview
                </button>
                <button
                  onClick={() => approve(p)}
                  disabled={busy === p.id}
                  className="px-3 py-1.5 text-xs font-mono border-2 border-matcha text-matcha hover:bg-matcha hover:text-bg-base transition-colors disabled:opacity-50"
                >
                  ✓ approve
                </button>
                <button
                  onClick={() => reject(p)}
                  disabled={busy === p.id}
                  className="px-3 py-1.5 text-xs font-mono border-2 border-sakura text-sakura hover:bg-sakura hover:text-bg-base transition-colors disabled:opacity-50"
                >
                  ✕ reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <div className="dialog-backdrop" onClick={() => setPreview(null)}>
          <div className="dialog-panel !max-w-3xl !p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-border-strong bg-bg-elevated">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-mono">preview</div>
                <div className="font-display font-bold text-lg truncate">{preview.title}</div>
              </div>
              <button onClick={() => setPreview(null)} aria-label="Close" className="size-9 grid place-items-center text-text-muted hover:text-sakura">✕</button>
            </div>
            <div className="px-4 py-4 max-h-[70vh] overflow-y-auto">
              {preview.cover_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview.cover_url} alt="" className="w-full h-auto border-2 border-border-strong mb-4" />
              )}
              <BlogContent html={preview.body} />
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t-2 border-border-strong bg-bg-elevated">
              <button onClick={() => reject(preview)} disabled={busy === preview.id}
                className="px-3 py-2 text-sm font-mono border-2 border-sakura text-sakura hover:bg-sakura hover:text-bg-base disabled:opacity-50">
                ✕ reject
              </button>
              <button onClick={() => approve(preview)} disabled={busy === preview.id}
                className="px-3 py-2 text-sm font-mono border-2 border-matcha text-matcha hover:bg-matcha hover:text-bg-base disabled:opacity-50">
                ✓ approve &amp; publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
