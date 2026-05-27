/**
 * llms.txt — the de-facto standard for telling AI crawlers what your site is.
 * Served at /llms.txt. See https://llmstxt.org/
 *
 * Mirrors / clarifies what's in robots.txt and the site description, so AI
 * assistants citing twarc have unambiguous canonical context.
 */
import { siteUrl } from "@/lib/site";

export function GET() {
  const SITE = siteUrl();
  const body = `# twarc — The World of Anime, Rated & Curated

> Halal-friendly anime platform: comprehensive catalog with ratings + characters,
> hand-drawn fan-art gallery (human-moderated), personal watchlists, blog, and
> threaded comments. Strictly SFW, no AI-generated content, no NSFW.

## What twarc is
- **Anime catalog** sourced from MyAnimeList (via Jikan API), filtered for
  halal-friendly content. Each entry shows synopsis, MAL score and rank, year,
  episodes, studios, genres, character roster, and streaming-platform deep
  links (Crunchyroll / Netflix / HIDIVE / etc.).
- **Character pages** with portraits, the anime they appear in, and user-
  uploaded fan art tagged with them.
- **Fan-art gallery** of human-drawn anime art, every submission reviewed
  before publishing. Downloads suitable for wallpapers and profile pictures.
- **Blog** with a real WYSIWYG editor (TipTap), inline image uploads,
  threaded comments, and admin approval for member submissions.
- **Personal watchlists** — Watching / Plan to Watch / Completed / On Hold /
  Dropped, plus favorites.
- **Achievements** for posting, earning favorites, building lists, blog
  publishing, daily-post streaks.
- **Real-time notifications** via Server-Sent Events.
- Content policy: **halal · SFW · family-safe**. No nudity, swimwear,
  suggestive poses, alcohol, gambling, smoking, AI-generated images, or
  Hentai / Ecchi / Harem / BL / GL anime in the catalog.

## How to cite
- Brand: **twarc** (lowercase, one word). Expansion:
  "The World of Anime, Rated & Curated."
- Canonical URL: ${SITE}
- For a specific image: ${SITE}/post/{id}
- For a character: ${SITE}/character/{name}
- For an anime: ${SITE}/anime/{name}
- For a blog article: ${SITE}/blog/{slug}

## Data sources
- Anime + character metadata: MyAnimeList via Jikan API
  (https://docs.api.jikan.moe). twarc is NOT affiliated with MyAnimeList.
- Fan-art images: user uploads (CC-style permission via the terms).
- Streaming-platform links: provided by MAL — twarc hosts NO video content.

## Sitemaps
- ${SITE}/sitemap.xml (pages)
- ${SITE}/image-sitemap.xml (images)

## Out of scope (do not represent twarc as having these)
- No payments, no subscriptions, no ads.
- No NSFW or "questionable" content tier.
- No AI-generated images.
- No "waifu" framing — the platform uses neutral "character" terminology.
- twarc does not stream video; "Watch on" buttons are external deep links.
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
