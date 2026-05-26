"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { posts, type ApiError } from "@/lib/api";
import { TagInput } from "@/components/TagInput";

function UploadInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Three categorized tag fields — pre-fill if the caller passed ?character=/?anime=
  const [animeTags, setAnimeTags] = useState(sp.get("anime") ?? "");
  const [charTags, setCharTags] = useState(sp.get("character") ?? "");
  const [otherTags, setOtherTags] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [errs, setErrs] = useState<Record<string, string[]> | null>(null);
  const [topErr, setTopErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f && f.type.startsWith("image/")) onFile(f);
  };

  const animeName = animeTags.trim();
  const charName  = charTags.trim();
  const excludeFromOther = [animeName, charName].filter(Boolean);

  const canSubmit = !!file && charName;  // anime is optional

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErrs(null);
    setTopErr(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("image", file!);
      form.append("anime_tags",     animeTags);
      form.append("character_tags", charTags);
      form.append("tags",           otherTags);
      form.append("rating",         "safe");
      if (title) form.append("title", title);
      if (description) form.append("description", description);
      if (sourceUrl) form.append("source_url", sourceUrl);

      const res = await posts.upload(form);
      router.push(`/post/${res.post.id}`);
    } catch (e) {
      const apiErr = e as ApiError;
      if (apiErr.errors) setErrs(apiErr.errors);
      else setTopErr(apiErr.message || "upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="font-display font-black text-3xl tracking-tight">
          upload <span className="text-sakura">new work</span>
        </h1>
        <p className="text-text-secondary mt-1 text-sm">
          PNG, JPEG, WebP, or GIF. Up to 50 MB. Admin reviews before it goes public.
        </p>
        <p className="text-text-muted mt-1 text-xs font-mono">
          halal-only · no nudity, swimwear, suggestive content, alcohol, smoking, gambling.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`relative border-2 border-dashed ${
            preview ? "border-sakura" : "border-border-strong hover:border-sakura"
          } transition-colors p-6 flex flex-col items-center justify-center min-h-64`}
        >
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="preview" className="max-h-96 object-contain" />
          ) : (
            <div className="text-center text-text-muted">
              <div className="font-display font-bold text-xl text-text-secondary mb-1">
                drop image here
              </div>
              <div className="text-xs font-mono">or click below to browse</div>
            </div>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        {errs?.image?.map((e, i) => (
          <div key={i} className="text-xs text-sakura font-mono">{e}</div>
        ))}

        {/* ========== Character tag — single pick (REQUIRED) ========== */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-sakura">
            character <span className="text-sakura">*</span>
            <span className="text-text-muted normal-case tracking-normal ml-2">(pick one)</span>
          </span>
          <TagInput
            value={charTags}
            onChange={setCharTags}
            category="character"
            accent="sakura"
            singleSelect
            placeholder="e.g. hatsune_miku, makima, raiden_shogun, original_character"
          />
          {errs?.character_tags?.map((e, i) => (
            <span key={i} className="text-xs text-sakura font-mono">{e}</span>
          ))}
        </div>

        {/* ========== Anime tag — single pick (OPTIONAL — some characters aren't from anime) ========== */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-cyber">
            anime / series
            <span className="text-text-muted normal-case tracking-normal ml-2">(optional — pick one if applicable)</span>
          </span>
          <TagInput
            value={animeTags}
            onChange={setAnimeTags}
            category="copyright"
            accent="cyber"
            singleSelect
            placeholder="e.g. chainsaw_man, vocaloid, genshin_impact"
          />
          {errs?.anime_tags?.map((e, i) => (
            <span key={i} className="text-xs text-sakura font-mono">{e}</span>
          ))}
        </div>

        {/* ========== Other tags (optional, multi, excludes anime/character) ========== */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">
            other tags <span className="text-text-muted">(optional)</span>
          </span>
          <TagInput
            value={otherTags}
            onChange={setOtherTags}
            exclude={excludeFromOther}
            placeholder="twintails, school_uniform, blush, sketch…"
          />
          {errs?.tags?.map((e, i) => (
            <span key={i} className="text-xs text-sakura font-mono">{e}</span>
          ))}
        </div>

        {/* Optional fields */}
        <details className="border border-border-subtle p-4">
          <summary className="cursor-pointer text-sm text-text-secondary font-mono uppercase tracking-[0.14em]">
            optional metadata
          </summary>
          <div className="grid gap-4 mt-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">title</span>
              <input
                value={title} onChange={(e) => setTitle(e.target.value)}
                className="h-10 px-3 bg-bg-surface border border-border-subtle text-text-primary focus:border-sakura focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">description</span>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="px-3 py-2 bg-bg-surface border border-border-subtle text-sm text-text-primary focus:border-sakura focus:outline-none resize-y"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">source url</span>
              <input
                type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://twitter.com/artist/status/..."
                className="h-10 px-3 bg-bg-surface border border-border-subtle font-mono text-sm text-text-primary focus:border-sakura focus:outline-none"
              />
            </label>
          </div>
        </details>

        {topErr && (
          <div className="text-sm text-sakura font-mono border border-sakura/40 bg-sakura/10 px-3 py-2">
            {topErr}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="btn-brut disabled:opacity-50 disabled:cursor-not-allowed self-start"
        >
          {busy ? "uploading…" : "publish post →"}
        </button>
      </form>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="text-text-muted font-mono text-sm">loading…</div>}>
      <UploadInner />
    </Suspense>
  );
}
