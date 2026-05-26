# twarc — Web

Next.js 16 (App Router) frontend for [twarc.net](https://twarc.net).

This is one app in the [twarc monorepo](../..). For full context — what twarc
is, how to set it up locally, contribution guide — see the
[root README](../../README.md).

## Stack

- Next.js 16 App Router (React 19, server components by default)
- Tailwind CSS v4 (CSS-first `@theme` config in `app/globals.css`)
- TypeScript strict
- TipTap v3 for the blog editor + DOMPurify for safe HTML render
- Server-Sent Events for real-time notifications (`lib/useNotificationStream.ts`)
- `lib/api.ts` — typed fetch wrapper around the Laravel API with auto-CSRF priming

## Quick start

From the repo root, after the API is running on `:8000`:

```bash
cp apps/web/.env.example apps/web/.env.local
cd apps/web
pnpm install
pnpm dev
# → http://localhost:3000
```

## Routes (selected)

| Route | What |
|---|---|
| `/` | Landing — sections for trending anime, characters, tags, posts, blog |
| `/anime` `/anime/[name]` | Anime catalog browse + detail |
| `/characters` `/character/[name]` | Character catalog |
| `/tag/[name]` | Tag detail with post list |
| `/post/[id]` | Fan-art detail |
| `/u/[username]` | Public profile with posts + achievements |
| `/dashboard/*` | Creator panel (upload, edit, stats) |
| `/admin/*` | Mod queue, tag editor, user management |
| `/blog` `/blog/[slug]` | Long-form articles |
| `/search` | Unified search (posts, tags, users) |

## Lint + type check

```bash
pnpm lint           # ESLint
npx tsc --noEmit    # type check
```

CI runs both on every PR.

## License

[AGPL-3.0-only](../../LICENSE) — same as the rest of the project.
