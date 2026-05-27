/**
 * Server-side helpers for generateMetadata() — fetch our own API from inside the box.
 * Pages that need fresh data for OG / canonical / title use these.
 */

import { siteUrl, siteHost } from "./site";

const INTERNAL_API = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8000";

/** @deprecated Use siteUrl() from ./site for new code. Kept for compatibility
 *  with existing import sites that use the constant form. */
export const SITE = siteUrl();

export async function fetchJsonInternal<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${INTERNAL_API}${path}`, {
      headers: { Accept: "application/json", Host: siteHost() },
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch { return null; }
}

/** Strip + truncate a string for meta-description use. */
export function trunc(s: string | null | undefined, n = 160): string {
  if (!s) return "";
  const cleaned = s.replace(/\s+/g, " ").trim();
  if (cleaned.length <= n) return cleaned;
  return cleaned.slice(0, n - 1).trimEnd() + "…";
}

/** Convert tag_string ("hatsune_miku twintails") → "Hatsune Miku, twintails". */
export function humanizeTags(tagString: string | null | undefined, limit = 10): string {
  if (!tagString) return "";
  return tagString
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, limit)
    .map((t) => t.replace(/_/g, " "))
    .join(", ");
}

/** Convert "hatsune_miku" → "Hatsune Miku". */
export function humanizeName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build a BreadcrumbList JSON-LD payload — Google uses this to show
 *  breadcrumb links under the title in SERP. */
export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.url}`,
    })),
  };
}

/** Common keyword pool prepended to every post/tag page — captures
 *  wallpaper/pfp/icon search intent which is where most image-search
 *  traffic actually comes from. */
export const SEO_KEYWORDS_BASE = [
  "anime wallpaper",
  "anime pfp",
  "anime profile picture",
  "anime icon",
  "anime fan art",
  "halal anime",
  "anime characters",
  "hand-drawn anime",
  "anime art gallery",
  "anime aesthetic",
];
