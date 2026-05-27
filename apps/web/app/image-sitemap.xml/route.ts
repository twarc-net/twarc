/**
 * Google Image Sitemap — serves every indexable image on twarc paired with
 * the page it lives on:
 *   - User-uploaded fan-art posts (full-resolution)
 *   - Anime cover images (MAL CDN, surfaced on /anime/{name})
 *   - Character portraits (MAL CDN, surfaced on /character/{name})
 *   - Blog cover images (surfaced on /blog/{slug})
 *
 * Listed in robots.txt so Googlebot-Image discovers it. Google caps a single
 * image sitemap at 50,000 entries; we stay well under that for now and can
 * split into a sitemap index later if the catalog explodes.
 *
 * Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 */

import type { NextRequest } from "next/server";
import { siteUrl } from "@/lib/site";

const BASE = siteUrl();
const INTERNAL_API = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8000";
const MAX_ENTRIES = 50_000;

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function humanizeName(name: string | null | undefined): string {
  if (!name) return "";
  return String(name).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${INTERNAL_API}${path}`, {
      headers: { Accept: "application/json", Host: "twarc.net" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch { return null; }
}

type AnimeOrChar = {
  name: string;
  cover_url: string | null;
  cover_thumb: string | null;
  post_count: number;
  public_path: string;
};

async function fetchAllPaged<T>(
  base: string,
  perPage: number,
  maxItems: number,
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= 200; page++) {
    if (out.length >= maxItems) break;
    const sep = base.includes("?") ? "&" : "?";
    const url = `${base}${sep}page=${page}&per_page=${perPage}`;
    const r = await fetchJson<{ data: T[]; meta?: { last_page?: number } }>(url);
    const data = r?.data ?? [];
    if (data.length === 0) break;
    out.push(...data);
    if (r?.meta?.last_page != null && page >= r.meta.last_page) break;
  }
  return out.slice(0, maxItems);
}

export async function GET(_req: NextRequest) {
  type Post = {
    id: number; original_url: string; preview_url?: string;
    width: number; height: number; tag_string: string;
    title: string | null; description: string | null; created_at: string;
  };
  type Blog = {
    slug: string; title: string; excerpt: string;
    cover_url: string | null; updated_at: string;
  };

  // Pull in parallel from every source.
  const [posts, animes, chars, blogs] = await Promise.all([
    fetchAllPaged<Post>("/api/posts?sort=new", 200, 20_000),
    fetchAllPaged<AnimeOrChar>("/api/anime?sort=popular", 200, 15_000),
    fetchAllPaged<AnimeOrChar>("/api/characters?sort=favs", 200, 12_000),
    fetchAllPaged<Blog>("/api/blog", 200, 2_000),
  ]);

  const urls: string[] = [];

  // ─── 1. User-uploaded posts ─────────────────────────────────────────────
  for (const p of posts) {
    if (urls.length >= MAX_ENTRIES) break;
    if (!p?.id || !p?.original_url) continue;
    const tagsHuman = (p.tag_string ?? "").split(/\s+/).filter(Boolean)
      .slice(0, 10).map((t) => t.replace(/_/g, " ")).join(", ");
    const title = p.title || tagsHuman || `Anime art #${p.id}`;
    const caption = p.description || tagsHuman || `Halal-friendly anime art on twarc`;
    const lastmod = p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString();
    urls.push(`  <url>
    <loc>${BASE}/post/${p.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <image:image>
      <image:loc>${esc(p.original_url)}</image:loc>
      <image:title>${esc(title)} — anime art · twarc</image:title>
      <image:caption>${esc(caption)} — ${p.width ?? 0}×${p.height ?? 0} hand-drawn anime art (halal, family-safe).</image:caption>
    </image:image>
  </url>`);
  }

  // ─── 2. Anime catalog covers ───────────────────────────────────────────
  for (const a of animes) {
    if (urls.length >= MAX_ENTRIES) break;
    const img = a?.cover_url ?? a?.cover_thumb;
    const path = a?.public_path;
    const name = a?.name;
    if (!img || !path || !name) continue;
    const human = humanizeName(name);
    urls.push(`  <url>
    <loc>${BASE}${path}</loc>
    <image:image>
      <image:loc>${esc(img)}</image:loc>
      <image:title>${esc(human)} — anime · twarc</image:title>
      <image:caption>${esc(human)} anime cover on twarc · halal-friendly anime catalog with characters, ratings, and fan art.</image:caption>
    </image:image>
  </url>`);
  }

  // ─── 3. Character portraits ────────────────────────────────────────────
  for (const c of chars) {
    if (urls.length >= MAX_ENTRIES) break;
    const img = c?.cover_url ?? c?.cover_thumb;
    const path = c?.public_path;
    const name = c?.name;
    if (!img || !path || !name) continue;
    const human = humanizeName(name);
    urls.push(`  <url>
    <loc>${BASE}${path}</loc>
    <image:image>
      <image:loc>${esc(img)}</image:loc>
      <image:title>${esc(human)} — anime character · twarc</image:title>
      <image:caption>${esc(human)} character portrait · anime fan art and PFPs on twarc.</image:caption>
    </image:image>
  </url>`);
  }

  // ─── 4. Blog post covers ───────────────────────────────────────────────
  for (const b of blogs) {
    if (urls.length >= MAX_ENTRIES) break;
    if (!b?.cover_url || !b?.slug) continue;
    const lastmod = b.updated_at ? new Date(b.updated_at).toISOString() : new Date().toISOString();
    urls.push(`  <url>
    <loc>${BASE}/blog/${b.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <image:image>
      <image:loc>${esc(b.cover_url)}</image:loc>
      <image:title>${esc(b.title ?? "")} — twarc blog</image:title>
      <image:caption>${esc(b.excerpt ?? b.title ?? "")}</image:caption>
    </image:image>
  </url>`);
  }

  // Safety net so Google never sees an empty <urlset>.
  if (urls.length === 0) {
    urls.push(`  <url>
    <loc>${BASE}/</loc>
    <image:image>
      <image:loc>https://cdn.twarc.net/twarc.png</image:loc>
      <image:title>twarc — The World of Anime, Rated &amp; Curated</image:title>
      <image:caption>twarc home — halal-friendly anime catalog and fan-art gallery.</image:caption>
    </image:image>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
