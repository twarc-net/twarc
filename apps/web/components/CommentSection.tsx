"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { comments, type CommentNode } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { VerifiedTick } from "@/components/VerifiedTick";
import { CommentBody } from "@/components/CommentBody";
import { CommentForm } from "@/components/CommentForm";
import { useAuth } from "@/lib/auth-context";

type Tree = CommentNode & { children: Tree[] };

function buildTree(rows: CommentNode[]): Tree[] {
  const byId = new Map<number, Tree>();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));
  const roots: Tree[] = [];
  for (const r of byId.values()) {
    if (r.parent_id && byId.has(r.parent_id)) byId.get(r.parent_id)!.children.push(r);
    else roots.push(r);
  }
  const sort = (n: Tree) => { n.children.sort((a, b) => a.created_at.localeCompare(b.created_at)); n.children.forEach(sort); };
  roots.sort((a, b) => a.created_at.localeCompare(b.created_at));
  roots.forEach(sort);
  return roots;
}

/**
 * Threaded comment list + composer. Targets either an image post (`postId`)
 * or a blog post (`blogSlug`) — pass exactly one.
 */
export function CommentSection({
  postId, blogSlug,
}: {
  postId?: number; blogSlug?: string;
}) {
  const { user } = useAuth();
  const [tree, setTree] = useState<Tree[] | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = blogSlug != null
        ? await comments.blogList(blogSlug)
        : postId != null ? await comments.list(postId) : { data: [], meta: { total: 0 } };
      setTree(buildTree(r.data));
      setTotal(r.meta.total);
    } catch {
      setTree([]);
    }
  }, [postId, blogSlug]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="border-t border-border-subtle mt-8 pt-6 max-w-3xl">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display font-black text-xl tracking-tight">
          comments <span className="text-text-muted text-sm font-mono">· {total}</span>
        </h2>
      </div>

      <div className="mb-6">
        <CommentForm postId={postId} blogSlug={blogSlug} onPosted={load} />
      </div>

      {tree === null ? (
        <div className="text-text-muted font-mono text-sm">loading…</div>
      ) : tree.length === 0 ? (
        <div className="text-text-muted text-sm text-center py-6 border border-dashed border-border-strong">
          be the first to comment
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tree.map((c) => (
            <CommentNodeRow key={c.id} node={c} postId={postId} blogSlug={blogSlug} depth={0} currentUserId={user?.id} onChange={load} />
          ))}
        </div>
      )}
    </section>
  );
}

function CommentNodeRow({
  node, postId, blogSlug, depth, currentUserId, onChange,
}: {
  node: Tree; postId?: number; blogSlug?: string;
  depth: number; currentUserId?: number; onChange: () => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isMine = currentUserId && node.user?.id === currentUserId;

  const remove = async () => {
    if (!confirm("Delete this comment?")) return;
    try {
      await comments.delete(node.id);
      onChange();
    } catch {}
  };

  return (
    <div className={depth > 0 ? `ml-${Math.min(depth, 4) * 4} pl-3 border-l border-border-subtle` : ""}>
      <div className="flex gap-3">
        {node.user && (
          <Link href={`/u/${node.user.username}`} className="shrink-0">
            <Avatar user={node.user} size="sm" />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            {node.user ? (
              <Link href={`/u/${node.user.username}`} className="font-mono text-sm text-sakura hover:underline">
                @{node.user.username}
              </Link>
            ) : (
              <span className="font-mono text-sm text-text-muted">[deleted]</span>
            )}
            {node.user?.is_verified && <VerifiedTick verified size="xs" />}
            {node.user?.display_name && (
              <span className="text-xs text-text-muted">{node.user.display_name}</span>
            )}
            <span className="text-xs text-text-muted font-mono ml-auto" title={node.created_at}>
              {timeAgo(node.created_at)}
            </span>
          </div>

          {!collapsed && <CommentBody body={node.body} />}

          <div className="flex items-center gap-3 mt-1 text-xs font-mono text-text-muted">
            {currentUserId && (
              <button onClick={() => setReplyOpen((o) => !o)} className="hover:text-sakura transition-colors">
                {replyOpen ? "cancel" : "reply"}
              </button>
            )}
            {node.children.length > 0 && (
              <button onClick={() => setCollapsed((c) => !c)} className="hover:text-cyber transition-colors">
                {collapsed ? `show ${node.children.length}` : `collapse ${node.children.length}`}
              </button>
            )}
            {isMine && (
              <button onClick={remove} className="hover:text-sakura-deep transition-colors ml-auto">
                delete
              </button>
            )}
          </div>

          {replyOpen && (
            <div className="mt-2">
              <CommentForm
                postId={postId}
                blogSlug={blogSlug}
                parentId={node.id}
                placeholder={`reply to @${node.user?.username ?? "user"}…`}
                autoFocus
                compact
                onPosted={() => { setReplyOpen(false); onChange(); }}
                onCancel={() => setReplyOpen(false)}
              />
            </div>
          )}

          {!collapsed && node.children.length > 0 && (
            <div className="flex flex-col gap-3 mt-3">
              {node.children.map((child) => (
                <CommentNodeRow key={child.id} node={child} postId={postId} blogSlug={blogSlug} depth={depth + 1} currentUserId={currentUserId} onChange={onChange} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}
