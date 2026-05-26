"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { posts, postsDelete, type PostFull } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar } from "@/components/Avatar";
import { VerifiedTick } from "@/components/VerifiedTick";

function formatBytes(n: number): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function buildDownloadName(p: PostFull): string {
  const slugBase =
    (p.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) ||
    p.tag_string.split(/\s+/).filter(Boolean).slice(0, 2).join("-") ||
    `post-${p.id}`;
  return `twarc-${p.id}-${slugBase}.${p.ext}`;
}

export function PostDetailClient({ id, initialPost }: { id: number; initialPost?: PostFull | null }) {
  const { user } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState<PostFull | null | "missing">(initialPost ?? null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [favPending, setFavPending] = useState(false);
  const [favCount, setFavCount] = useState(initialPost?.fav_count ?? 0);
  const [favorited, setFavorited] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
    posts.get(id)
      .then((r) => { setPost(r.post); setFavCount(r.post.fav_count); })
      .catch(() => setPost("missing"));
  }, [id]);

  const toggleFav = async () => {
    if (!user || !post || post === "missing") return;
    setFavPending(true);
    try {
      const r = favorited ? await posts.unfavorite(post.id) : await posts.favorite(post.id);
      setFavorited(r.favorited);
      setFavCount(r.fav_count);
    } finally { setFavPending(false); }
  };

  const onDelete = async () => {
    if (!post || post === "missing") return;
    setBusy(true);
    try {
      await postsDelete(post.id);
      router.push("/browse");
    } finally { setBusy(false); }
  };

  if (post === null) {
    return (
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div className="skeleton border border-border-subtle aspect-[3/4]" />
          <div className="flex flex-col gap-3">
            <div className="skeleton h-10" />
            <div className="skeleton h-24" />
            <div className="skeleton h-32" />
          </div>
        </div>
      </main>
    );
  }
  if (post === "missing") {
    return <main className="flex-1 grid place-items-center text-text-muted font-mono">post not found</main>;
  }

  const canDelete = user && (user.id === post.uploader?.id || user.role === "admin" || user.role === "moderator");
  const tagList = post.tag_string.split(/\s+/).filter(Boolean);
  const altText = post.title || tagList.slice(0, 5).map((t) => t.replace(/_/g, " ")).join(", ") || `post ${post.id}`;

  return (
    <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 md:gap-8">
        {/* Image */}
        <div className="relative border border-border-subtle bg-bg-surface flex items-center justify-center p-2 min-h-[300px]">
          {!imgLoaded && <div className="absolute inset-2 skeleton" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.preview_url}
            alt={altText}
            onLoad={() => setImgLoaded(true)}
            className={`relative max-w-full max-h-[80vh] object-contain ${imgLoaded ? "img-fade" : "opacity-0"}`}
          />
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={toggleFav}
              disabled={!user || favPending}
              className={`btn-brut !text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                favorited ? "" : "!bg-bg-surface !text-sakura"
              }`}
              title={user ? "Toggle favorite" : "Log in to favorite"}
            >
              ♥ {favCount} {favorited ? "favorited" : "favorite"}
            </button>
            {post.original_url && (
              <a
                href={post.original_url}
                download={buildDownloadName(post)}
                className="btn-ghost !text-sm inline-flex items-center gap-1.5"
                title={`Download original (${formatBytes(post.file_size)})`}
              >
                ↓ download
                <span className="text-text-muted text-xs font-mono">
                  {formatBytes(post.file_size)}
                </span>
              </a>
            )}
            {canDelete && (
              <button
                onClick={() => setDelOpen(true)}
                className="px-3 h-10 text-sm text-sakura border border-sakura/40 hover:bg-sakura hover:text-bg-base transition-colors font-mono"
                title="Delete post"
              >
                delete
              </button>
            )}
          </div>

          {/* Uploader */}
          {post.uploader && (
            <Link
              href={`/u/${post.uploader.username}`}
              className="border border-border-subtle p-3 fade-in flex items-center gap-3 hover:border-sakura transition-colors"
              style={{ animationDelay: "60ms" }}
            >
              <Avatar user={post.uploader} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted font-mono">uploaded by</div>
                <div className="text-sakura font-display font-bold truncate">
                  {post.uploader.display_name ?? post.uploader.username}
                  <VerifiedTick verified={post.uploader.is_verified} />
                </div>
                <div className="text-xs text-text-muted font-mono">@{post.uploader.username}</div>
              </div>
            </Link>
          )}

          {/* Tags */}
          <div className="border border-border-subtle p-3 fade-in" style={{ animationDelay: "120ms" }}>
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted font-mono mb-2">
              tags · {post.tag_count}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tagList.map((t) => (
                <Link key={t} href={`/browse?tags=${encodeURIComponent(t)}`} className="tag-chip">
                  {t}
                </Link>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div className="border border-border-subtle p-3 text-xs font-mono space-y-1 text-text-muted fade-in" style={{ animationDelay: "180ms" }}>
            <div className="flex justify-between"><span>rating</span><span className={post.rating === "safe" ? "text-matcha" : "text-peach"}>{post.rating}</span></div>
            <div className="flex justify-between"><span>size</span><span className="text-text-secondary">{post.width}×{post.height}</span></div>
            <div className="flex justify-between"><span>score</span><span className="text-text-secondary">{post.score}</span></div>
            <div className="flex justify-between"><span>posted</span><span className="text-text-secondary">{new Date(post.created_at).toLocaleDateString()}</span></div>
          </div>

          {post.title && (
            <div className="border border-border-subtle p-3 fade-in">
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted font-mono mb-1">title</div>
              <div className="text-text-primary">{post.title}</div>
            </div>
          )}
          {post.description && (
            <div className="border border-border-subtle p-3 fade-in">
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted font-mono mb-1">description</div>
              <div className="text-text-secondary text-sm whitespace-pre-wrap">{post.description}</div>
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={delOpen}
        title="Delete this post?"
        message="The post and its files will be soft-deleted. Admins can restore within 30 days."
        confirmLabel="delete"
        danger
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setDelOpen(false)}
      />
    </main>
  );
}
