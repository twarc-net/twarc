# Changelog

All notable changes to twarc will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

Nothing yet. Open a [Discussion](https://github.com/twarc-net/twarc/discussions)
if you want to influence what lands next.

## [0.1.0] — 2026-05-27

First public release. Source opened under AGPL-3.0; production already live
at [twarc.net](https://twarc.net) since 2026-05-25.

### Added

- **Anime catalog** — thousands of series imported from Jikan with synopsis,
  MAL rank, year, episodes, studios, genres, and full character roster.
- **Character pages** — portrait + appearing-in list + community fan art.
- **Per-user lists** — Watching / Plan to Watch / Completed / On Hold /
  Dropped status enum + favorites bucket. Backed by `user_anime_lists`.
- **Fan-art uploads** — sha256-deduped, 3 webp variants (thumb / card /
  detail) via Intervention\Image + libvips. Every post enters a moderator
  queue before going public for members.
- **Tag system** — Danbooru-style aliases + implications + categories
  (general / character / artist / copyright / series / meta), GIN-indexed
  on `posts.tag_ids`.
- **Discovery + search** — home sections, category browses (`/anime`,
  `/characters`, `/artists`, `/tags`), unified search across posts +
  tags + users (Postgres trigram autocomplete).
- **Auth** — Laravel Fortify + Sanctum SPA cookies. Login accepts email
  or username; 2FA columns in `users` ready for the UI.
- **Moderation** — `EnsureAdmin` middleware, mod queue at `/admin/moderate`,
  tag editor at `/admin/tags`, user role + ban at `/admin/users`. All
  actions audited in `mod_actions`.
- **Notifications** — SSE stream + toaster, follow / favorite / comment /
  achievement events.
- **Achievements** — Steam-style badges with locked-state previews and
  progress on user profile pages.
- **Blog** — long-form articles with a TipTap editor, threaded comments,
  separate moderation flow.
- **Halal-content guard** — server-side `HalalGuard` strips/rejects
  Danbooru tags outside `rating:g` and a configurable blocklist before
  the post hits storage.
- **SEO** — image sitemap + JSON-LD on detail pages; OG/Twitter cards
  on every route.

### Security

- `users.role` removed from mass-assign fillable; all role mutations go
  through `forceFill` in `UserAdminController` (admin-gated).
- nginx blocks direct origin IP access — only Cloudflare ranges can reach
  the origin (`set_real_ip_from` + `geo` allowlist).
- Rate limits: login 5/min, register 5/hour per IP, upload 30/hour per user.
- `source_url` validation restricted to `http`/`https` (kills the
  `javascript:` XSS vector in upload metadata).

### Infra

- Single VPS deployment behind Cloudflare. nginx fronts Next.js (`:3000`)
  and php-fpm. Horizon worker + Next.js + log rotation under systemd;
  nightly Postgres backup with 14-day retention.
- Daily Jikan catalog refresh + tag cleanup as scheduled Horizon jobs.

[Unreleased]: https://github.com/twarc-net/twarc/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/twarc-net/twarc/releases/tag/v0.1.0
