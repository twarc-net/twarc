"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { admin, adminTagCover, type AdminTagRow, type TagCategory } from "@/lib/api";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Row = AdminTagRow & { cover_url?: string | null };

export type AdminTagManagerProps = {
  /** When set, lock the manager to a single category. When null, show all + a picker. */
  fixedCategory?: TagCategory | null;
  /** Display style: "cards" for anime/characters (cover-forward), "table" for general/meta */
  display?: "cards" | "table";
  title: string;
  accent?: "cyber" | "sakura" | "peach";
  description?: string;
  /** Public URL prefix for "view" link (default "/tag", or "/anime", "/character") */
  publicPrefix?: string;
};

const CATS: TagCategory[] = ["general", "artist", "copyright", "character", "meta"];
const CAT_LABELS: Record<TagCategory, string> = {
  general: "General", artist: "Artist", copyright: "Anime / series", character: "Character", meta: "Meta",
};

export function AdminTagManager({
  fixedCategory = null,
  display = "table",
  title,
  accent = "cyber",
  description,
  publicPrefix = "/tag",
}: AdminTagManagerProps) {
  const [items, setItems] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState<TagCategory | "">(fixedCategory ?? "");
  const [missingCoverOnly, setMissingCoverOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState<TagCategory>(fixedCategory ?? "copyright");
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  // Edit / delete dialogs
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const accentBorder = accent === "sakura" ? "border-sakura/40" : accent === "peach" ? "border-peach/40" : "border-cyber/40";
  const accentText   = accent === "sakura" ? "text-sakura"      : accent === "peach" ? "text-peach"      : "text-cyber";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await admin.tags({
        q: q || undefined,
        category: (fixedCategory ?? filterCat) || undefined,
      });
      const data = r.data as Row[];
      setItems(missingCoverOnly ? data.filter((t) => !t.cover_url) : data);
    } finally { setLoading(false); }
  }, [q, filterCat, fixedCategory, missingCoverOnly]);

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
      setNewName("");
      await load();
    } catch (e) {
      setCreateErr((e as { message?: string }).message ?? "failed");
    } finally { setCreateBusy(false); }
  };

  const toggleLock = (t: Row) => admin.updateTag(t.id, { is_locked: !t.is_locked }).then(load);
  const changeCategory = (t: Row, cat: TagCategory) => admin.updateTag(t.id, { category: cat }).then(load);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display font-black text-3xl tracking-tight">
          {title.split(" ").map((w, i) =>
            i === title.split(" ").length - 1
              ? <span key={i} className={accentText}>{w}</span>
              : <span key={i}>{w} </span>
          )}
        </h1>
        {description && <p className="text-text-secondary text-sm mt-1">{description}</p>}
      </div>

      {/* Create form */}
      <form onSubmit={createTag} className={`border ${accentBorder} bg-bg-surface p-4 flex flex-col gap-3`}>
        <div className={`text-xs uppercase tracking-[0.2em] ${accentText} font-mono`}>+ create new {fixedCategory ? CAT_LABELS[fixedCategory].toLowerCase() : "tag"}</div>
        <div className="flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={fixedCategory === "copyright" ? "genshin_impact, evangelion, blue_archive…"
                       : fixedCategory === "character" ? "hatsune_miku, raiden_shogun…"
                       : "tag_name"}
            className={`flex-1 min-w-[240px] h-10 px-3 bg-bg-base border border-border-subtle font-mono text-sm text-text-primary focus:${accentBorder.replace('/40','')} focus:outline-none`}
            required
          />
          {!fixedCategory && (
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value as TagCategory)}
              className={`h-10 px-3 bg-bg-base border border-border-subtle text-sm text-text-primary focus:outline-none`}
            >
              {CATS.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          )}
          <button
            type="submit"
            disabled={createBusy || !newName.trim()}
            className={`btn-brut ${accent === "cyber" ? "!bg-cyber !shadow-[var(--shadow-brut-cyber)]" : ""} !py-2 !px-4 !text-sm disabled:opacity-50`}
          >
            {createBusy ? "…" : "create →"}
          </button>
        </div>
        <p className="text-xs text-text-muted">After creating, click <span className={accentText}>edit</span> below to add a cover image + description.</p>
        {createErr && <p className="text-xs text-sakura font-mono">{createErr}</p>}
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`search ${fixedCategory ? CAT_LABELS[fixedCategory].toLowerCase() + "s" : "tags"}…`}
          className="flex-1 min-w-[200px] h-9 px-3 bg-bg-surface border border-border-subtle font-mono text-sm text-text-primary focus:outline-none"
        />
        {!fixedCategory && (
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value as TagCategory | "")}
            className="h-9 px-3 bg-bg-surface border border-border-subtle text-sm text-text-primary focus:outline-none"
          >
            <option value="">all categories</option>
            {CATS.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-xs font-mono text-text-secondary cursor-pointer ml-auto">
          <input type="checkbox" checked={missingCoverOnly} onChange={(e) => setMissingCoverOnly(e.target.checked)} className="accent-cyber" />
          missing cover only
        </label>
      </div>

      <div className="text-xs font-mono text-text-muted">
        {loading ? "…" : `${items.length} ${fixedCategory ? CAT_LABELS[fixedCategory].toLowerCase() + (items.length === 1 ? "" : "s") : "tag" + (items.length === 1 ? "" : "s")}`}
      </div>

      {/* Display */}
      {display === "cards" ? (
        <CardGrid items={items} loading={loading} publicPrefix={publicPrefix}
          onEdit={setEditing} onDelete={(t) => setDeleting(t)} onToggleLock={toggleLock} />
      ) : (
        <TableView items={items} loading={loading} publicPrefix={publicPrefix} fixedCategory={fixedCategory}
          onEdit={setEditing} onDelete={(t) => setDeleting(t)} onToggleLock={toggleLock} onChangeCategory={changeCategory} />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete "${deleting?.name}"?`}
        message={
          deleting && deleting.post_count > 0
            ? `Used on ${deleting.post_count} post${deleting.post_count === 1 ? "" : "s"}. Tag will be removed from all of them. Cover + aliases also deleted. Cannot be undone.`
            : "Cover + aliases will be deleted. Cannot be undone."
        }
        confirmLabel="delete"
        danger
        busy={delBusy}
        onConfirm={async () => {
          if (!deleting) return;
          setDelBusy(true);
          try {
            await admin.deleteTag(deleting.id);
            setDeleting(null);
            await load();
          } finally { setDelBusy(false); }
        }}
        onCancel={() => setDeleting(null)}
      />

      {editing && (
        <EditTagModal tag={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

// ============== Cards layout (for anime + characters) ==============

function CardGrid({
  items, loading, publicPrefix, onEdit, onDelete, onToggleLock,
}: {
  items: Row[]; loading: boolean; publicPrefix: string;
  onEdit: (t: Row) => void; onDelete: (t: Row) => void; onToggleLock: (t: Row) => void;
}) {
  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[2/3] border border-border-subtle" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return <div className="border border-dashed border-border-strong p-10 text-center text-text-muted">nothing here</div>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map((t) => (
        <div key={t.id} className="border border-border-subtle bg-bg-surface flex flex-col overflow-hidden">
          {/* Cover */}
          <Link href={`${publicPrefix}/${t.name}`} target="_blank" className="block relative aspect-[2/3] bg-bg-base group">
            {t.cover_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={t.cover_url} alt={t.name} className="size-full object-cover group-hover:opacity-80 transition-opacity" loading="lazy" />
            ) : (
              <div className="size-full grid place-items-center border-2 border-dashed border-border-subtle">
                <span className="font-display font-black text-5xl text-text-muted/30 select-none">
                  {t.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {!t.cover_url && (
              <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-peach text-bg-base">
                no cover
              </span>
            )}
            {t.is_locked && (
              <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-mono bg-bg-base/80 border border-border-strong">
                🔒
              </span>
            )}
          </Link>

          {/* Meta + actions */}
          <div className="p-2.5 flex flex-col gap-2">
            <div className="font-mono text-sm text-text-primary truncate" title={t.name}>{t.name}</div>
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>{t.post_count} posts</span>
              <button onClick={() => onToggleLock(t)} className="hover:text-cyber" title={t.is_locked ? "Unlock" : "Lock"}>
                {t.is_locked ? "🔒" : "○"}
              </button>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(t)}
                className="flex-1 px-2 py-1.5 text-xs font-mono border border-cyber text-cyber hover:bg-cyber hover:text-bg-base transition-colors"
              >
                edit
              </button>
              <button
                onClick={() => onDelete(t)}
                disabled={t.is_locked}
                className="px-2 py-1.5 text-xs font-mono border border-sakura/40 text-sakura hover:bg-sakura hover:text-bg-base transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={t.is_locked ? "Unlock first" : "Delete"}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============== Table layout (for general / meta / artist) ==============

function TableView({
  items, loading, publicPrefix, fixedCategory, onEdit, onDelete, onToggleLock, onChangeCategory,
}: {
  items: Row[]; loading: boolean; publicPrefix: string; fixedCategory: TagCategory | null;
  onEdit: (t: Row) => void; onDelete: (t: Row) => void; onToggleLock: (t: Row) => void;
  onChangeCategory: (t: Row, cat: TagCategory) => void;
}) {
  return (
    <div className="border border-border-subtle bg-bg-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-[0.14em] text-text-muted font-mono border-b border-border-subtle">
          <tr>
            <th className="text-left p-2.5 w-16">cover</th>
            <th className="text-left p-2.5">name</th>
            {!fixedCategory && <th className="text-left p-2.5">category</th>}
            <th className="text-right p-2.5">posts</th>
            <th className="text-center p-2.5">locked</th>
            <th className="text-center p-2.5">actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={6} className="p-2"><div className="skeleton h-8" /></td></tr>
            ))
          ) : items.length === 0 ? (
            <tr><td colSpan={6} className="p-6 text-center text-text-muted">no tags match</td></tr>
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
                <Link href={`${publicPrefix}/${t.name}`} target="_blank" className="font-mono text-text-primary hover:text-cyber">
                  {t.name}
                </Link>
              </td>
              {!fixedCategory && (
                <td className="p-2.5">
                  <select
                    value={t.category}
                    onChange={(e) => onChangeCategory(t, e.target.value as TagCategory)}
                    disabled={t.is_locked}
                    className="h-7 px-2 bg-bg-base border border-border-subtle text-xs focus:outline-none disabled:opacity-50"
                  >
                    {CATS.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </td>
              )}
              <td className="p-2.5 text-right font-mono text-text-secondary">{t.post_count}</td>
              <td className="p-2.5 text-center">
                <button onClick={() => onToggleLock(t)} className="text-xs hover:text-cyber" title={t.is_locked ? "Unlock" : "Lock"}>
                  {t.is_locked ? "🔒" : "○"}
                </button>
              </td>
              <td className="p-2.5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => onEdit(t)} className="text-xs text-cyber hover:underline font-mono">edit</button>
                  <button
                    onClick={() => onDelete(t)}
                    disabled={t.is_locked}
                    className="text-xs text-sakura hover:text-sakura-deep font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                    title={t.is_locked ? "Unlock first" : "Delete"}
                  >
                    ×
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============== Edit modal ==============

function EditTagModal({ tag, onClose, onSaved }: { tag: Row; onClose: () => void; onSaved: () => void }) {
  const [desc, setDesc] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    admin.tags({ q: tag.name }).then((r) => {
      const fresh = r.data.find((t) => t.id === tag.id) as unknown as { description?: string | null };
      if (fresh?.description) setDesc(fresh.description);
    }).catch(() => {});
  }, [tag.id, tag.name]);

  const save = async () => {
    setErr(null);
    setBusy(true);
    try {
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
      if (file) await adminTagCover.upload(tag.id, file);
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
              <p className="text-xs text-text-muted">Portrait (2:3) works best. Generates thumb/card/hero variants.</p>
              {tag.cover_url && (
                <button onClick={removeCover} disabled={busy} className="text-xs text-sakura hover:text-sakura-deep self-start">
                  remove current cover
                </button>
              )}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">description</span>
            <textarea
              value={desc} onChange={(e) => setDesc(e.target.value)} rows={5}
              placeholder="A short blurb shown on the public detail page…"
              className="px-3 py-2 bg-bg-base border border-border-subtle text-sm text-text-primary focus:border-cyber focus:outline-none resize-y"
            />
          </label>
        </div>

        {err && <div className="text-xs text-sakura font-mono mt-3">{err}</div>}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} disabled={busy} className="btn-ghost !py-2 !px-4 !text-sm">cancel</button>
          <button onClick={save} disabled={busy} className="btn-brut !bg-cyber !shadow-[var(--shadow-brut-cyber)] !py-2 !px-4 !text-sm">
            {busy ? "saving…" : "save"}
          </button>
        </div>
      </div>
    </div>
  );
}
