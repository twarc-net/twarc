# Contributing to twarc

Thanks for the interest. twarc is run by humans for humans — every contribution moves the platform forward. This doc tells you how to land a change cleanly.

## Code of conduct

By participating you agree to follow [our Code of Conduct](CODE_OF_CONDUCT.md). TL;DR: be kind, assume good faith, no harassment.

## What kind of contributions we love

- **Bug fixes** — pick anything on the [issue tracker](https://github.com/twarc-net/twarc/issues)
- **Mobile / accessibility polish** — keyboard navigation, screen-reader labels, RTL support
- **New achievements** — see `database/seeders/AchievementsSeeder.php`
- **Internationalization** — start with the static UI strings
- **Search improvements** — Postgres trigram tuning, Meilisearch wiring
- **Documentation** — examples, troubleshooting, deployment recipes
- **Design tweaks** — palette, typography, motion (open a discussion first for major redesigns)

## What we're cautious about

Open a **GitHub Discussion** before starting work on these:

- Schema migrations (anything touching the `posts`, `tags`, `users`, `anime_meta`, `character_meta`, `comments` tables)
- New external integrations (3rd-party APIs, payment, analytics)
- Anything that touches the halal content policy or moderation flow
- Anything that loosens the SFW / no-AI / no-NSFW constraints (we will say no — these are non-negotiable)

## Development setup

See [README.md → Quickstart](README.md#quickstart-local-dev).

## Workflow

1. **Fork** the repo to your account.
2. **Branch** from `main`: `git checkout -b fix/short-summary` or `feat/short-summary`.
3. **Code**. Match the surrounding style — see [Style guide](#style-guide) below.
4. **Test** locally — at minimum run the API + web dev servers and click through.
5. **Commit** with a clear message. Convention: `<area>: <imperative summary>`, e.g. `web: fix navbar overflow on iOS Chrome`. Body is optional but appreciated when the *why* isn't obvious from the diff.
6. **Push** and open a PR against `main`.
7. Fill in the PR template — what + why + how to test.
8. CI runs lint + build verification. A maintainer reviews within ~3 days.

## Style guide

### Backend (Laravel / PHP)

- PSR-12 formatting (run `vendor/bin/pint` if you have it).
- Domain logic lives in `app/Services/` and `app/Models/`.
- Controllers stay thin — validate, call a service, return JSON.
- Use `Schema::table()` + `Blueprint` for migrations; never edit an applied migration, write a follow-up.
- Database changes need a `down()` method that genuinely reverses.
- Comments should explain *why*, not *what*. The code says what; the comment says why we chose this approach over alternatives.

### Frontend (Next.js / React / TypeScript)

- TypeScript strict mode. No `any` without a `// eslint-disable-next-line` and a reason.
- Tailwind CSS for styling — match the existing palette (`sakura`, `cyber`, `text-primary`, `bg-bg-*`) and shadow pattern.
- Use semantic HTML (`<button>`, not `<div onClick>`), and add `aria-*` for non-obvious controls.
- Server components by default; opt into `"use client"` only when needed.
- Image work goes through `next/image` — never raw `<img>` for catalog/blog content. (Some `<img>` survives in the codebase for legacy reasons — feel free to migrate.)
- Mobile-first responsive: tap targets ≥ 40 px, no hover-only affordances.

### Commit message style

```
area: short imperative summary

Longer paragraph explaining motivation and notable decisions
if the diff doesn't make them obvious. Wrap at ~72 cols.
```

Areas: `api`, `web`, `db`, `infra`, `docs`, `ci`, `chore`.

## Tests

Test coverage is light right now; that's a known debt. New backend behavior should ideally land with a feature test (`tests/Feature/...`) — but a clear "how I tested this" in the PR is acceptable for trivial changes.

## Reviewing PRs

If you're reviewing someone else's PR:

- Be specific. "Consider extracting this into `App\Services\Foo` because of X" is more useful than "refactor this".
- Approve ✅ if the change is good as-is. Request changes only when you really need them changed.
- Don't bikeshed style — let formatters handle it.

## License

By contributing, you agree your contribution is licensed under the same [AGPL-3.0-only](LICENSE) license as the project. You retain copyright on your contribution.

## Questions

- Mechanical questions about the codebase: [Discussions](https://github.com/twarc-net/twarc/discussions)
- Reach a maintainer: `hello@twarc.net`
