/**
 * Runtime site-identity helpers.
 *
 * These read process.env at request time (server components only) so the
 * published Docker image can be deployed to any domain without rebuilding.
 *
 * For client-side code use NEXT_PUBLIC_SITE_URL if you absolutely need the
 * origin — but prefer relative URLs in the browser, since Caddy routes
 * /api/* and / on the same host.
 */

const FALLBACK = "http://localhost:3000";

/** Canonical origin for this deployment, e.g. "https://twarc.net". */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK)
    .replace(/\/+$/, "");
}

/** Bare hostname (no scheme, no port), used as the Host header on
 *  server-side fetches so Sanctum treats them as same-origin. */
export function siteHost(): string {
  try {
    return new URL(siteUrl()).host;
  } catch {
    return "localhost";
  }
}
