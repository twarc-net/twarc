import type { MetadataRoute } from "next";

const BASE = "https://twarc.net";

/**
 * Permissive crawl policy: every public page + asset is indexable.
 * Only auth/admin/api surfaces are blocked.
 *
 * `host` declares the canonical hostname for Yandex.
 * The pair `sitemap` + `image-sitemap` is referenced from both robots.txt and
 * the WebSite JSON-LD in layout.tsx so all major search engines pick up both.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // All bots
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/auth/",
          "/sanctum/",
          "/dashboard/",
          "/admin/",
          "/notifications",
          "/login",
          "/register",
          "/*?*sort=",      // canonicalise sorted views
          "/*?*page=",      // canonicalise paginated views
        ],
      },
      {
        // Tell Googlebot-Image explicitly it can crawl every CDN/storage variant.
        userAgent: "Googlebot-Image",
        allow: ["/", "/storage/", "/api/posts/*/image"],
        disallow: ["/admin/", "/dashboard/"],
      },
      {
        // Bingbot — same rules as default but listed explicitly for emphasis.
        userAgent: "Bingbot",
        allow: ["/"],
        disallow: ["/api/", "/auth/", "/sanctum/", "/dashboard/", "/admin/"],
      },
    ],
    sitemap: [
      `${BASE}/sitemap.xml`,
      `${BASE}/image-sitemap.xml`,
    ],
    host: BASE,
  };
}
