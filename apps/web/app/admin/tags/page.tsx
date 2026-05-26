"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { admin, adminTagCover, type AdminTagRow, type TagCategory } from "@/lib/api";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const CATS: TagCategory[] = ["general", "artist", "copyright", "character", "meta"];
const CAT_LABELS: Record<TagCategory, string> = {
  general: "General",
  artist: "Artist",
  copyright: "Anime / series",
  character: "Character",
  meta: "Meta",
};
const CAT_DESC: Record<TagCategory, string> = {
  general:   "everyday descriptors (twintails, smile, blush)",
  artist:    "the human who drew it (artist names)",
  copyright: "the anime / game / series the character is from (genshin_impact, evangelion)",
  character: "specific characters — anime cast, video-game characters, OCs (hatsune_miku, raiden_shogun)",
  meta:      "platform tags (fanart, original_character, wip)",
};

type Row = AdminTagRow & { cover_url?: string | null };

export default function TagsAdminPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState<TagCategory | "">("");
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState<TagCategory>("copyright");
  const [newDesc, setNewDesc] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  // Per-row edit state
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await admin.tags({ q: q || undefined, category: filterCat || undefined });
      setItems(r.data as Row[]);
    } finally { setLoading(false); }
  }, [q, filterCat]);

  useEffect(() => {
    const t = setTimeout(load, q ? 200 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const createTag = async (e: FormEvent) => {
    e.preventDefault();
    setCreateErr(null);
    setCreateBusy(true);
    try {
      await admin.createTag({ name: newName.trim().toLowerCase(), category: newCat });
      if (newDesc.trim()) {
        // Patch description after creation
        const created = (await admin.tags({ q: newName.trim().toLowerCase() })).data[0];
        if (created) {
          await admin.updateTag(created.id, { });
          // updateTag with description requires patch — need to extend api.ts to accept description
        }
      }
      setNewName(""); setNewDesc("");
      await load();
    } catch (e) {
      setCreateErr((e as { message?: string }).message ?? "failed");
    } finally { setCreateBusy(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display font-black text-3xl tracking-tight">
          tag <span className="text-cyber">manager</span>
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Create canonical names for anime, characters, artists. Add covers + descriptions to make them browsable.
        </p>
      </div>

      {/* Create form */}
      <form onSubmit={createTag} className="border border-cyber/40 bg-bg-surface p-4 flex flex-col gap-3">
        <div className="text-xs uppercase tracking-[0.2em] text-cyber font-mono">+ create new tag</div>
        <div className="flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="tag_name (e.g. genshin_impact, hatsune_miku)"
            className="flex-1 min-w-[240px] h-10 px-3 bg-bg-base border border-border-subtle font-mono text-sm text-text-primary focus:border-cyber focus:outline-none"
            required
          />
          <select
            value={newCat}
            onChange={(e) => setNewCat(e.target.value as TagCategory)}
            className="h-10 px-3 bg-bg-base border border-border-subtle text-sm text-text-primary focus:border-cyber focus:outline-none"
          >
            {CATS.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
          <button
            type="submit"
            disabled={createBusy || !newName.trim()}
            className="btn-brut !bg-cyber !shadow-[var(--shadow-brut-cyber)] !py-2 !px-4 !text-sm disabled:opacity-50"
          >
            {createBusy ? "…" : "create →"}
          </button>
        </div>
        <p className="text-xs text-text-muted">{CAT_DESC[newCat]}</p>
        <p className="text-xs text-text-muted">After creating: click <span className="text-cyber">edit</span> on the row to add a cover image and description.</p>
        {createErr && <p className="text-xs text-sakura font-mono">{createErr}</p>}
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search tags…"
          className="flex-1 min-w-[200px] h-9 px-3 bg-bg-surface border border-border-subtle font-mono text-sm text-text-primary focus:border-cyber focus:outline-none"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value as TagCategory | "")}
          className="h-9 px-3 bg-bg-surface border border-border-subtle text-sm text-text-primary focus:border-cyber focus:outline-none"
        >
          <option value="">all categories</option>
          {CATS.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="border border-border-subtle bg-bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-text-muted font-mono border-b border-border-subtle">
            <tr>
              <th className="text-left p-2.5 w-16">cover</th>
              <th className="text-left p-2.5">name</th>
              <th className="text-left p-2.5">category</th>
              <th className="text-right p-2.5">posts</th>
              <th className="text-center p-2.5">locked</th>
              <th className="text-center p-2.5">edit</th>
              <th className="text-center p-2.5">delete</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="p-2"><div className="skeleton h-7" /></td></tr>
              ))
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-text-muted">no tags match</td></tr>
            ) : items.map((t) => (
              <tr key={t.id} className="border-b border-border-subtle/60 hover:bg-bg-elevated/50">
                <td className="p-2">
                  {t.cover_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={t.cover_url} alt="" className="size-10 object-cover border border-border-subtle" />
                  ) : (
                    <div className="size-10 bg-bg-base border border-dashed border-border-subtle grid place-items-center text-text-muted text-xs">—</div>
                  )}
                </td>
                <td className="p-2.5">
                  <Link href={t.cover_url ? `/anime/${t.name}` : `/tag/${t.name}`} className="font-mono text-text-primary hover:text-cyber" target="_blank">
                    {t.name}
                  </Link>
                </td>
                <td className="p-2.5">
                  <select
                    value={t.category}
                    onChange={(e) => admin.updateTag(t.id, { category: e.target.value as TagCategory }).then(load)}
                    disabled={t.is_locked}
                    className="h-7 px-2 bg-bg-base border border-border-subtle text-xs text-text-secondary focus:border-cyber focus:outline-none disabled:opacity-50"
                  >
                    {CATS.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </td>
                <td className="p-2.5 text-right font-mono text-text-secondary">{t.post_count}</td>
                <td className="p-2.5 text-center">
                  <button
                    onClick={() => admin.updateTag(t.id, { is_locked: !t.is_locked }).then(load)}
                    className="text-xs font-mono hover:text-cyber"
                  >
                    {t.is_locked ? "🔒" : "○"}
                  </button>
                </td>
                <td className="p-2.5 text-center">
                  <button
                    onClick={() => setEditing(t)}
                    className="text-xs text-cyber hover:underline font-mono"
                  >
                    edit
                  </button>
                </td>
                <td className="p-2.5 text-center">
                  <button
                    onClick={() => { setDeleting(t); setDelErr(null); }}
                    disabled={t.is_locked}
                    className="text-xs text-sakura hover:text-sakura-deep font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                    title={t.is_locked ? "Unlock first" : "Delete tag"}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete tag "${deleting?.name}"?`}
        message={
          deleting && deleting.post_count > 0
            ? `This tag is used on ${deleting.post_count} post${deleting.post_count === 1 ? "" : "s"}. The tag will be removed from all of them, and its cover image (if any) will be deleted. This cannot be undone.`
            : "This will delete the tag, its cover image (if any), and any aliases/implications referencing it. This cannot be undone."
        }
        confirmLabel="delete tag"
        danger
        busy={delBusy}
        onConfirm={async () => {
          if (!deleting) return;
          setDelBusy(true);
          setDelErr(null);
          try {
            await admin.deleteTag(deleting.id);
            setDeleting(null);
            await load();
          } catch (e) {
            setDelErr((e as { message?: string }).message ?? "delete failed");
          } finally {
            setDelBusy(false);
          }
        }}
        onCancel={() => setDeleting(null)}
      >
        {delErr && <div className="text-xs text-sakura font-mono mt-3">{delErr}</div>}
      </ConfirmDialog>

      {editing && (
        <EditTagModal
          tag={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function EditTagModal({
  tag, onClose, onSaved,
}: {
  tag: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [desc, setDesc] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load full tag data with description (admin.tags returns it but our store endpoint doesn't always re-issue)
    admin.tags({ q: tag.name }).then((r) => {
      const fresh = r.data.find((t) => t.id === tag.id) as unknown as { description?: string | null };
      if (fresh?.description) setDesc(fresh.description);
    }).catch(() => {});
  }, [tag.id, tag.name]);

  const save = async () => {
    setErr(null);
    setBusy(true);
    try {
      // Update description
      await admin.updateTag(tag.id, { });
      // Hack: server-side updateTag in our current code accepts {category, is_locked} only via TS type but server accepts description too
      await fetch(`/api/admin/tags/${tag.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": decodeURIComponent(document.cookie.split("XSRF-TOKEN=")[1]?.split(";")[0] ?? ""),
        },
        body: JSON.stringify({ description: desc || null }),
      });

      // Upload cover if a new file selected
      if (file) {
        await adminTagCover.upload(tag.id, file);
      }
      onSaved();
    } catch (e) {
      setErr((e as { message?: string }).message ?? "save failed");
    } finally { setBusy(false); }
  };

  const removeCover = async () => {
    if (!confirm("Remove the cover image?")) return;
    setBusy(true);
    try {
      await adminTagCover.remove(tag.id);
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog-panel max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-black text-xl tracking-tight mb-1">
          edit <span className="text-cyber">{tag.name}</span>
        </h2>
        <p className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted mb-5">{tag.category}</p>

        <div className="flex flex-col gap-4">
          {/* Cover */}
          <div className="flex gap-4 items-start">
            <div className="size-32 shrink-0 border-2 border-border-strong bg-bg-base grid place-items-center overflow-hidden">
              {file ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={URL.createObjectURL(file)} alt="" className="size-full object-cover" />
              ) : tag.cover_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={tag.cover_url} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-text-muted text-xs font-mono">no cover</span>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">cover image</div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-xs text-text-secondary file:border-0 file:bg-cyber file:text-bg-base file:font-mono file:px-3 file:py-1.5 file:mr-3 cursor-pointer"
              />
              <p className="text-xs text-text-muted">Portrait orientation works best (2:3). Will generate thumb/card/hero variants.</p>
              {tag.cover_url && (
                <button onClick={removeCover} disabled={busy} className="text-xs text-sakura hover:text-sakura-deep self-start">
                  remove current cover
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">description</span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={5}
              placeholder="A short blurb shown on the public detail page…"
              className="px-3 py-2 bg-bg-base border border-border-subtle text-sm text-text-primary focus:border-cyber focus:outline-none resize-y"
            />
          </label>
        </div>

        {err && <div className="text-xs text-sakura font-mono mt-3">{err}</div>}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} disabled={busy} className="btn-ghost !py-2 !px-4 !text-sm">cancel</button>
          <button onClick={save} disabled={busy} className="btn-brut !bg-cyber !shadow-[var(--shadow-brut-cyber)] !py-2 !px-4 !text-sm">
            {busy ? "saving…" : "save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
