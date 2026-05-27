import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const BASE = siteUrl();
const INTERNAL_API = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8000";

// Google's per-sitemap cap is 50,000 URLs; we stay below that and can split
// into a sitemap index later if the catalog crosses the line.
const MAX_URLS = 50_000;

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

/** Walk every page of a paginated list endpoint. */
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static high-priority routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                     lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/anime`,          lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/characters`,     lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/browse`,         lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE}/blog`,           lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/tags`,           lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/search`,         lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/register`,       lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/login`,          lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/about`,          lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/terms`,          lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/privacy`,        lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
  ];

  // Pull all dynamic content in parallel — paginate fully so nothing is missed.
  type Post  = { id: number; created_at: string };
  type Tag   = { name: string; public_path: string };
  type Blog  = { slug: string; updated_at: string };

  const [posts, animes, chars, blogs] = await Promise.all([
    fetchAllPaged<Post>("/api/posts?sort=new",        200, 25_000),
    fetchAllPaged<Tag>("/api/anime?sort=popular",     200, 12_000),
    fetchAllPaged<Tag>("/api/characters?sort=favs",   200, 8_000),
    fetchAllPaged<Blog>("/api/blog",                  200, 2_000),
  ]);

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/post/${p.id}`,
    lastModified: new Date(p.created_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const animeRoutes: MetadataRoute.Sitemap = animes.map((t) => ({
    url: `${BASE}${t.public_path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const characterRoutes: MetadataRoute.Sitemap = chars.map((t) => ({
    url: `${BASE}${t.public_path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogs.map((b) => ({
    url: `${BASE}/blog/${b.slug}`,
    lastModified: new Date(b.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const all = [
    ...staticRoutes,
    ...animeRoutes,
    ...characterRoutes,
    ...blogRoutes,
    ...postRoutes,
  ].slice(0, MAX_URLS);

  return all;
}
