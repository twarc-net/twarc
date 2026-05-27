<div align="center">

<a href="https://twarc.net"><img src="https://cdn.twarc.net/twarc.png" alt="twarc — The World of Anime, Rated & Curated" width="100%"></a>

# twarc

**The World of Anime, Rated & Curated.**

A free, halal-friendly anime platform — catalog with ratings + characters,
hand-drawn fan-art gallery, watchlists, blogs, and threaded discussion.
All SFW. All human-curated. No AI slop.

### [Try it now → twarc.net](https://twarc.net)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![CI](https://github.com/twarc-net/twarc/actions/workflows/ci.yml/badge.svg)](https://github.com/twarc-net/twarc/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Discussions](https://img.shields.io/github/discussions/twarc-net/twarc?logo=github)](https://github.com/twarc-net/twarc/discussions)
[![Stars](https://img.shields.io/github/stars/twarc-net/twarc?style=flat&logo=github)](https://github.com/twarc-net/twarc/stargazers)

</div>

---

## What twarc is

twarc is an anime community site with strict content standards: **safe for work,
human-made art only, no AI-generated images**. It's built for people who love
anime as a craft and want a clean place to browse, list, discuss, and share.

- **Catalog** — thousands of anime with synopsis, MAL rank, year, episodes, studios, genres, full character roster, and streaming-platform links.
- **Characters** — portrait pages with the anime they appear in and any community art.
- **Lists** — Watching / Plan to Watch / Completed / On Hold / Dropped + favorites.
- **Fan art** — every upload is moderator-reviewed before publish.
- **Blog** — long-form essays with a real editor (images, formatting, links).
- **Comments** — threaded replies with `@`-mentions and real-time notifications.
- **Achievements** — Steam-style milestones on your profile.

Roadmap and feature debates happen in [**Discussions**](https://github.com/twarc-net/twarc/discussions) — please weigh in.

## Why open source it

The fan-art / anime-curation space has been hostile to open communities for years:
ad-supported sites get aggressive, AI-generated content has flooded the catalog,
and the better tools are walled-off. twarc is open source so the community can
audit the moderation rules, fork it if we ever drift, and contribute features
that wouldn't exist if we were doing this alone.

## Tech stack

| Layer | Pick |
|---|---|
| API | **Laravel 13** (PHP 8.5), Sanctum SPA cookies, Horizon, Scout |
| Web | **Next.js 16** App Router, Tailwind v4, TypeScript strict |
| DB | **Postgres 18** with `pg_trgm`, `btree_gin`, `citext`, `pgcrypto` |
| Cache + queue | Redis + Horizon |
| Search | Meilisearch v1.10 (Postgres trigram for autocomplete) |
| Images | imgproxy (libvips) on-the-fly variants, content-addressed paths |
| Storage | Local in dev, Backblaze B2 + Bunny CDN in prod |
| Layout | pnpm + Turborepo monorepo |

Architecture notes are in [`docs/architecture/`](docs/architecture/).

## Repo layout

```
apps/
  api/          Laravel 13 — REST/JSON API, mod queue, jobs
  web/          Next.js 16 — public site
infra/
  docker/       compose.dev.yml — Meilisearch + imgproxy
  terraform/    (deferred)
docs/
  architecture/ system + data-model docs
  legal/        DMCA + privacy reference text
  runbooks/     prod operations
packages/       (reserved for shared TS/PHP packages)
```

## Quickstart — local dev

**Prereqs:** PHP 8.3+, Node 20+, pnpm, Postgres 15+, Redis, Docker.

```bash
# 1. Clone + install
git clone https://github.com/twarc-net/twarc.git
cd twarc
pnpm install

# 2. Bring up Meilisearch + imgproxy
cp infra/docker/.env.example infra/docker/.env
# edit infra/docker/.env — fill in MEILI_MASTER_KEY / IMGPROXY_KEY / IMGPROXY_SALT
docker compose -f infra/docker/compose.dev.yml --env-file infra/docker/.env up -d

# 3. Laravel API
cd apps/api
cp .env.example .env
composer install
php artisan key:generate
# create the DB once: sudo -u postgres createdb twarc && createuser twarc -P
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000

# 4. Next.js web (in a new shell, from repo root)
cd apps/web
cp .env.example .env.local
pnpm dev
# → open http://localhost:3000
```

A fuller walkthrough with troubleshooting is in [`docs/runbooks/local-dev.md`](docs/runbooks/local-dev.md).

## Self-host with Docker (90 seconds)

Point a domain at a VPS, clone the repo, fill in a `.env`, and:

```bash
docker compose --env-file .env pull
docker compose --env-file .env up -d
```

That pulls pre-built multi-arch images from
[`ghcr.io/twarc-net/twarc-{api,web}`](https://github.com/orgs/twarc-net/packages?repo_name=twarc)
and brings up the whole stack — FrankenPHP + Laravel, Next.js, Postgres,
Redis, Meilisearch, imgproxy, Horizon, scheduler — with **automatic HTTPS**
via Let's Encrypt. No build step. No nginx config. No certbot.

Step-by-step (incl. backups, updates, build-from-source variant, image
provenance verification) in
[`docs/runbooks/docker-deploy.md`](docs/runbooks/docker-deploy.md).

## Contributing

PRs, bug reports, and ideas are all welcome. Start with [**CONTRIBUTING.md**](CONTRIBUTING.md)
for setup conventions, commit-message style, and what we look for in a review.

**Good first issues** are labeled [`good first issue`](https://github.com/twarc-net/twarc/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22).

## Content policy

twarc is intentionally narrow:

- **Halal-friendly, SFW only.** No NSFW content. The Danbooru rating
  vocabulary is filtered server-side ([`HalalGuard`](apps/api/app/Services/HalalGuard.php)).
- **No AI-generated images.** Reports get acted on; repeat uploaders get banned.
- **Hand-drawn / human-made fan art only.**

These are non-negotiable. Don't open a PR asking us to loosen them — it'll be closed.

## Security

Found a vulnerability? Please **don't** open a public issue. See [SECURITY.md](SECURITY.md)
for our private disclosure process.

## License

[AGPL-3.0-only](LICENSE). If you run a modified version on a public server,
you're required to share your modifications back. This is intentional — it
keeps forks honest and the community in the loop.

---

<div align="center">

Made by humans, for anime fans.<br>
<sub>If you ship a fork, link back — we'd love to see what people build.</sub>

</div>
