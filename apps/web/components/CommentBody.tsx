"use client";

import Link from "next/link";
import { Fragment } from "react";

/**
 * Render a comment's plain-text body with safe link/mention/GIF parsing.
 *
 * Recognized patterns:
 *   @username       →   /u/username link
 *   twarc.net/post/N    →   internal /post/N link "post #N"
 *   twarc.net/anime/X   →   internal /anime/X link "anime: X"
 *   twarc.net/character/X →   internal /character/X link "character: X"
 *   *.gif | tenor URL   →   inline <img>
 *   Other URLs          →   external <a target=_blank rel=...>
 */
export function CommentBody({ body }: { body: string }) {
  const tokens = tokenize(body);
  return (
    <div className="whitespace-pre-wrap break-words text-sm text-text-primary leading-relaxed">
      {tokens.map((t, i) => <Fragment key={i}>{renderToken(t)}</Fragment>)}
    </div>
  );
}

type Token =
  | { kind: "text"; v: string }
  | { kind: "mention"; v: string }
  | { kind: "internal"; href: string; label: string }
  | { kind: "gif"; src: string }
  | { kind: "external"; href: string };

// URL regex — captures common URL shapes
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;
const MENTION_RE = /@([a-z0-9_]{3,30})\b/gi;

function tokenize(body: string): Token[] {
  // Split on URLs first; then within each non-URL chunk split on mentions.
  const out: Token[] = [];
  let last = 0;
  const urlMatches: { idx: number; len: number; raw: string }[] = [];
  for (const m of body.matchAll(URL_RE)) {
    urlMatches.push({ idx: m.index ?? 0, len: m[0].length, raw: m[0] });
  }
  for (const { idx, len, raw } of urlMatches) {
    if (idx > last) tokenizeText(body.slice(last, idx), out);
    out.push(urlToken(raw));
    last = idx + len;
  }
  if (last < body.length) tokenizeText(body.slice(last), out);
  return out;
}

function tokenizeText(s: string, out: Token[]) {
  let last = 0;
  for (const m of s.matchAll(MENTION_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ kind: "text", v: s.slice(last, idx) });
    out.push({ kind: "mention", v: m[1].toLowerCase() });
    last = idx + m[0].length;
  }
  if (last < s.length) out.push({ kind: "text", v: s.slice(last) });
}

function urlToken(raw: string): Token {
  let u: URL;
  try { u = new URL(raw); } catch { return { kind: "text", v: raw }; }
  const host = u.hostname.replace(/^www\./, "");

  // Inline GIFs (Tenor or anything ending in .gif)
  if (host === "tenor.com" || host === "media.tenor.com" || /\.gif(\?|$)/i.test(u.pathname + u.search)) {
    return { kind: "gif", src: raw };
  }

  // Internal links
  if (host === "twarc.net") {
    const m = u.pathname.match(/^\/(post|anime|character|u|tag)\/([\w.\-()_]+)$/);
    if (m) {
      const [, kind, slug] = m;
      const labelMap: Record<string, (s: string) => string> = {
        post:      (s) => `post #${s}`,
        anime:     (s) => `anime: ${s.replace(/_/g, " ")}`,
        character: (s) => `character: ${s.replace(/_/g, " ")}`,
        u:         (s) => `@${s}`,
        tag:       (s) => `#${s}`,
      };
      return { kind: "internal", href: u.pathname, label: labelMap[kind]?.(slug) ?? raw };
    }
    return { kind: "internal", href: u.pathname || "/", label: u.pathname };
  }
  return { kind: "external", href: raw };
}

function renderToken(t: Token) {
  if (t.kind === "text") return <>{t.v}</>;
  if (t.kind === "mention") {
    return <Link href={`/u/${t.v}`} className="text-sakura hover:underline font-mono">@{t.v}</Link>;
  }
  if (t.kind === "internal") {
    return <Link href={t.href} className="text-cyber hover:underline font-mono">{t.label}</Link>;
  }
  if (t.kind === "gif") {
    return (
      <span className="inline-block my-1.5 max-w-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={t.src} alt="GIF" className="max-h-64 border border-border-subtle" loading="lazy" />
      </span>
    );
  }
  // external
  return (
    <a href={t.href} target="_blank" rel="noopener noreferrer nofollow"
       className="text-cyber underline hover:text-sakura break-all">
      {t.href}
    </a>
  );
}
