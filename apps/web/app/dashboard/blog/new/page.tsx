"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { blog, type ApiError } from "@/lib/api";
import { BlogEditor } from "@/components/BlogEditor";

export default function NewBlogPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string[]> | null>(null);
  const [topErr, setTopErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrs(null); setTopErr(null);
    try {
      const r = await blog.create({
        title:     title.trim(),
        body:      body.trim(),
        excerpt:   excerpt.trim() || undefined,
        cover_url: coverUrl.trim() || undefined,
      });
      router.push(r.post.status === "published" ? `/blog/${r.post.slug}` : "/dashboard/blog");
    } catch (e) {
      const a = e as ApiError;
      if (a.errors) setErrs(a.errors);
      else setTopErr(a.message ?? "publish failed");
    } finally { setBusy(false); }
  };

  const canSubmit = title.trim().length >= 5 && body.length >= 30;

  return (
    <div className="flex flex-col gap-5 sm:gap-6 max-w-4xl">
      <div>
        <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight">
          new <span className="text-sakura">blog post</span>
        </h1>
        <p className="text-text-secondary text-xs sm:text-sm mt-1">
          Rich editor with toolbar. Drag images straight in, paste from clipboard, or use the 🖼 button. Admin reviews before publishing.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">title <span className="text-sakura">*</span></span>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            required minLength={5} maxLength={200}
            placeholder="An article title that catches eyes…"
            className="h-12 px-3 bg-bg-surface border-2 border-border-subtle text-text-primary font-display text-base sm:text-lg focus:border-sakura focus:outline-none"
          />
          {errs?.title?.map((e, i) => <span key={i} className="text-xs text-sakura font-mono">{e}</span>)}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">cover image URL <span className="text-text-muted/70">(optional)</span></span>
          <input
            type="url"
            value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://cdn.twarc.net/blog/your-cover.webp"
            className="h-10 px-3 bg-bg-surface border-2 border-border-subtle text-sm text-text-primary font-mono focus:border-sakura focus:outline-none"
          />
          {errs?.cover_url?.map((e, i) => <span key={i} className="text-xs text-sakura font-mono">{e}</span>)}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">excerpt <span className="text-text-muted/70">(optional — auto from body if blank)</span></span>
          <textarea
            value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
            rows={2} maxLength={400}
            placeholder="A one-paragraph teaser shown on the blog index."
            className="px-3 py-2 bg-bg-surface border-2 border-border-subtle text-sm text-text-primary focus:border-sakura focus:outline-none resize-y"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">body <span className="text-sakura">*</span></span>
          <BlogEditor value={body} onChange={setBody} placeholder="Start writing… drag images right in." />
          {errs?.body?.map((e, i) => <span key={i} className="text-xs text-sakura font-mono">{e}</span>)}
        </div>

        {topErr && (
          <div className="text-sm text-sakura font-mono border-2 border-sakura/40 bg-sakura/10 px-3 py-2">{topErr}</div>
        )}

        <button type="submit" disabled={busy || !canSubmit}
          className="btn-brut self-start disabled:opacity-50 disabled:cursor-not-allowed">
          {busy ? "publishing…" : "publish →"}
        </button>
      </form>
    </div>
  );
}
