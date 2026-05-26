"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { comments, discovery } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { TenorGifPicker } from "@/components/TenorGifPicker";
import { useAuth } from "@/lib/auth-context";

/**
 * Comment / reply form with:
 *  - @-mention autocomplete (queries /api/search for users)
 *  - GIF picker (Tenor)
 *  - Submit on Cmd/Ctrl+Enter
 */
export function CommentForm({
  postId,
  blogSlug,
  parentId,
  onPosted,
  placeholder = "write a comment…",
  autoFocus = false,
  compact = false,
  onCancel,
}: {
  postId?: number;
  blogSlug?: string;
  parentId?: number;
  onPosted: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [gifOpen, setGifOpen] = useState(false);

  // mention autocomplete
  const [mentionQ, setMentionQ] = useState<string | null>(null);
  const [mentionRows, setMentionRows] = useState<{ username: string; display_name: string | null }[]>([]);
  const [mentionActiveIdx, setMentionActiveIdx] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Detect @prefix at the caret position
  const detectMention = useCallback((s: string, caret: number) => {
    const before = s.slice(0, caret);
    const m = before.match(/(?:^|\s)@([a-z0-9_]{1,30})$/i);
    return m ? m[1].toLowerCase() : null;
  }, []);

  useEffect(() => {
    if (mentionQ === null || mentionQ.length < 1) { setMentionRows([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await discovery.search(mentionQ);
        setMentionRows(r.users.slice(0, 6).map((u) => ({ username: u.username, display_name: u.display_name })));
        setMentionActiveIdx(0);
      } catch { setMentionRows([]); }
    }, 150);
    return () => clearTimeout(t);
  }, [mentionQ]);

  const onChange = (val: string) => {
    setBody(val);
    const caret = taRef.current?.selectionStart ?? val.length;
    setMentionQ(detectMention(val, caret));
  };

  const insertMention = (username: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart;
    const before = body.slice(0, caret);
    const after  = body.slice(caret);
    const newBefore = before.replace(/(?:^|\s)@([a-z0-9_]{1,30})$/i, (full) => {
      const lead = full.startsWith("@") ? "" : " ";
      return `${lead}@${username} `;
    });
    const next = newBefore + after;
    setBody(next);
    setMentionQ(null);
    setMentionRows([]);
    setTimeout(() => {
      ta.focus();
      const pos = newBefore.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertGif = (url: string) => {
    const ta = taRef.current;
    const caret = ta?.selectionStart ?? body.length;
    const prefix = body.slice(0, caret);
    const suffix = body.slice(caret);
    const sep = prefix && !prefix.endsWith("\n") && !prefix.endsWith(" ") ? " " : "";
    setBody(prefix + sep + url + " " + suffix);
    setGifOpen(false);
    setTimeout(() => ta?.focus(), 0);
  };

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true); setErr(null);
    try {
      if (blogSlug) {
        await comments.blogPost(blogSlug, body.trim(), parentId);
      } else if (postId != null) {
        await comments.post(postId, body.trim(), parentId);
      }
      setBody("");
      onPosted();
    } catch (e) {
      setErr((e as { message?: string }).message ?? "failed to post");
    } finally { setBusy(false); }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionRows.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionActiveIdx((i) => (i + 1) % mentionRows.length); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setMentionActiveIdx((i) => (i - 1 + mentionRows.length) % mentionRows.length); return; }
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        insertMention(mentionRows[mentionActiveIdx].username);
        return;
      }
      if (e.key === "Escape") { setMentionQ(null); setMentionRows([]); return; }
    }
    if ((e.key === "Enter") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  if (!user) {
    return (
      <div className="border border-border-subtle bg-bg-surface p-4 text-center text-sm text-text-muted">
        <Link href="/login" className="text-sakura hover:underline">log in</Link> to comment
      </div>
    );
  }

  return (
    <div className={`relative ${compact ? "" : "border border-border-subtle bg-bg-surface p-3"}`}>
      <div className="flex gap-3">
        {!compact && <Avatar user={user} size="md" className="mt-1" />}
        <div className="flex-1 flex flex-col gap-2">
          <textarea
            ref={taRef}
            value={body}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
            placeholder={placeholder}
            rows={compact ? 2 : 3}
            className="w-full px-3 py-2 bg-bg-base border border-border-subtle text-sm text-text-primary focus:border-sakura focus:outline-none resize-y leading-relaxed"
            maxLength={5000}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setGifOpen(true)}
              className="px-2 py-1 text-xs font-mono border border-border-subtle text-text-secondary hover:border-cyber hover:text-cyber transition-colors"
              title="Insert GIF"
            >
              GIF
            </button>
            <span className="text-xs text-text-muted font-mono hidden sm:inline">
              ⌘/Ctrl + Enter to post · @ to tag
            </span>
            <div className="ml-auto flex items-center gap-2">
              {onCancel && (
                <button type="button" onClick={onCancel} disabled={busy} className="text-xs font-mono text-text-muted hover:text-sakura transition-colors">
                  cancel
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={busy || !body.trim()}
                className="btn-brut !py-1.5 !px-3 !text-xs disabled:opacity-50"
              >
                {busy ? "…" : parentId ? "reply" : "comment"}
              </button>
            </div>
          </div>
          {err && <p className="text-xs text-sakura font-mono">{err}</p>}
        </div>
      </div>

      {/* @-mention autocomplete */}
      {mentionRows.length > 0 && (
        <div className="absolute z-30 left-12 right-3 mt-1 bg-bg-elevated border border-border-strong shadow-[var(--shadow-brut-sm)] max-h-60 overflow-y-auto">
          {mentionRows.map((u, i) => (
            <button
              key={u.username}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(u.username); }}
              onMouseEnter={() => setMentionActiveIdx(i)}
              className={`w-full px-3 py-1.5 text-left text-sm font-mono flex items-center gap-2 transition-colors ${
                i === mentionActiveIdx ? "bg-sakura/10 border-l-2 border-sakura" : "border-l-2 border-transparent hover:bg-bg-surface"
              }`}
            >
              <span className="text-sakura">@{u.username}</span>
              {u.display_name && <span className="text-text-muted text-xs">{u.display_name}</span>}
            </button>
          ))}
        </div>
      )}

      {gifOpen && <TenorGifPicker onPick={insertGif} onClose={() => setGifOpen(false)} />}
    </div>
  );
}
