import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a minimal standalone build at `.next/standalone/` so the
  // Docker image only needs to ship the files Next actually executes
  // at runtime (no full node_modules tree). See docker/Dockerfile.web.
  output: "standalone",

  images: {
    // Hosts that next/image is allowed to optimize from. Adding MAL's CDN here
    // so the catalog covers (until they're all rehosted) get the same
    // viewport-aware srcset treatment as our own images.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.twarc.net" },
      { protocol: "https", hostname: "twarc.net" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
    ],
    // Next.js 16 requires explicit quality values; 95 is for sharp text/logo.
    qualities: [75, 95],
    // Edge cache the optimized variants longer than the default 60s — the
    // underlying images don't change once published, so a long TTL cuts
    // re-optimization work and CDN bandwidth.
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  async redirects() {
    return [
      // Old /waifu* URLs from prior branding → new /character* canonical routes.
      // 301 (permanent) preserves SEO for any previously indexed links.
      { source: "/waifus",        destination: "/characters",     permanent: true },
      { source: "/waifu/:name",   destination: "/character/:name", permanent: true },
      { source: "/admin/waifus",  destination: "/admin/characters", permanent: true },
    ];
  },
};

export default nextConfig;
