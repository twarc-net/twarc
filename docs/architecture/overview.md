# Architecture overview

High-level shape of the twarc codebase. For tactical "how do I run it locally"
steps, see [`runbooks/local-dev.md`](../runbooks/local-dev.md).

## Two apps, one repo

```
┌───────────────────────────┐         ┌──────────────────────────┐
│   apps/web (Next.js 16)   │  HTTPS  │   apps/api (Laravel 13)  │
│   App Router, Tailwind 4  │ ──────▶ │   Sanctum SPA cookies    │
│   TypeScript strict       │ ◀────── │   Horizon, Scout, Pint   │
└───────────────────────────┘  cookie └──────────────────────────┘
            │                                     │
            │                                     ├─▶ Postgres 18
            │                                     ├─▶ Redis (cache + queue)
            │                                     ├─▶ Meilisearch
            │                                     ├─▶ imgproxy
            │                                     └─▶ Backblaze B2 (prod)
            ▼
       browser / mobile
```

In dev: `next dev` serves the web on `:3000`, `php artisan serve` serves the
API on `:8000`, both share `localhost` so session cookies work.

In prod: nginx fronts both. Static + SSR routes go to Next.js
(`127.0.0.1:3000`); `/api/*`, `/auth/*`, `/sanctum/*`, `/storage/*` go to
php-fpm. Same-origin — no CORS.

## Data model

20+ tables, all in Postgres. The load-bearing ones:

| Table | Purpose |
|---|---|
| `users` | Account, role enum (`member`/`contributor`/`moderator`/`admin`), 2FA cols |
| `posts` | Uploaded fan art. Status enum (`pending`/`active`/`rejected`), `tag_ids int[]` GIN-indexed |
| `post_versions` | Image variant URLs (thumb/card/full), checksums |
| `tags` | Booru-style. Categories: general/character/artist/copyright/series/meta |
| `tag_aliases` | "yor briar" → "yor forger" |
| `tag_implications` | "yor forger" → "spy x family" |
| `anime_meta` + `character_meta` + `anime_characters` | Catalog seeded from Jikan |
| `user_anime_lists` | Watching/Plan/Completed/etc. status enum per user-anime |
| `collections` + `collection_posts` | User-curated post sets |
| `comments` | Threaded (`parent_id`), polymorphic (`commentable_type`/`commentable_id`) |
| `notifications` + SSE | Real-time toast notifications |
| `badges` + `user_badges` | Steam-style achievements with progress |
| `blog_posts` | Long-form articles with Tiptap-edited HTML |
| `reports` + `mod_actions` + `dmca_notices` | Mod queue + audit trail |

Migrations live in `apps/api/database/migrations/`. Every applied migration is
immutable — schema changes go in a new migration with a working `down()`.

## Upload pipeline

`POST /api/posts` (multipart, requires Sanctum cookie + verified-tier role):

1. `UploadController::store` → `UploadService::handle($file, $tags, $rating, $meta)`
2. `HalalGuard::reject($tags)` — server-side enforcement of SFW + halal policy
3. sha256 + md5 of the original; collision lookup against `posts.sha256_hex`
4. Store original to `posts/{sha[0:2]}/{sha[2:4]}/{sha}.{ext}`
5. Generate 3 webp variants (180w thumb, 360w card, 850w detail) via Intervention\Image v4 + libvips
6. Tag normalization: lowercase, replace aliases, expand implications
7. Insert `posts` row with `status = uploader.isModerator() ? 'active' : 'pending'`
8. Recount `tags.post_count` (debounced via Horizon job in prod)
9. Index into Meilisearch (Scout queues an `IndexPost` job)

Mods approve from `/admin/moderate`. Approval flips status → `active` and
notifies the uploader.

## Discovery + ranking

`DiscoveryController` serves the home page sections and category browses.
Ranking is intentionally simple right now: `created_at DESC` for "latest",
`fav_total DESC` for "popular", trigram similarity for tag autocomplete.
Tag-based feeds use the GIN index on `posts.tag_ids` for `@>` containment
queries — sub-10ms for typical browse loads.

When the post count is large enough that Postgres trigram is too slow for
search (probably ~1M posts), the migration target is OpenSearch via
Philomena-style query parsing.

## Authentication

- **Fortify** routes under `/auth/*` (we moved them off the default `''`
  prefix to avoid colliding with the Next.js `/login` and `/register` pages).
- **Sanctum** in stateful (SPA cookie) mode — session-backed, CSRF-protected.
  No bearer tokens for first-party clients.
- **2FA** columns exist in `users` (`two_factor_secret`, `two_factor_recovery_codes`)
  but enrollment UI isn't built yet.
- **Passkeys** scaffolded but disabled until we have HTTPS in dev (or you
  enable a localhost cert).
- Email or username works on login — see the `Fortify::authenticateUsing`
  callback in `apps/api/app/Providers/FortifyServiceProvider.php`.

## Background jobs

Horizon owns the queue. Notable jobs:

- `ImportFromJikan` — nightly catalog refresh (anime + characters)
- `ImportFromDanbooru` — bulk import (admin-triggered, halal-filtered)
- `AwardAchievements` — runs after user activity events
- `RehostCatalogCovers` — pulls remote MAL covers and re-hosts them
- `CleanupTags` — empty-tag GC

All jobs survive crashes + reboots via systemd in prod.

## Front-end

- App Router, server components by default.
- `apps/web/lib/api.ts` is the typed fetch wrapper. Every call primes the CSRF
  cookie if missing, then includes credentials.
- `apps/web/lib/auth-context.tsx` exposes `useAuth()` for client components.
- TipTap for the blog editor (`apps/web/components/BlogEditor.tsx`),
  DOMPurify on render for XSS protection.
- Notifications: SSE stream from `/api/notifications/stream`,
  consumed by `useNotificationStream.ts`, surfaced via a `Toaster`.

## What we deliberately don't do (yet)

- **No ActivityPub / federation.** Maybe one day, but not before launch traction.
- **No mobile native apps.** PWA-friendly responsive web only.
- **No ML recommendations.** Hand-curated collections instead.
- **No AI detection.** Community reports + ban-the-uploader is cheaper than
  Hive's API and good enough for our scale.
- **No payments yet.** When we add them we'll go CCBill/Segpay, not Stripe —
  Stripe is unreliable for adult-adjacent communities even when you're SFW.

If you want to debate any of these, open a [Discussion](https://github.com/twarc-net/twarc/discussions).
