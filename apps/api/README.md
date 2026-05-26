# twarc — API

Laravel 13 backend for [twarc.net](https://twarc.net).

This is one app in the [twarc monorepo](../..). For full context — what twarc
is, how to set it up locally, contribution guide — see the
[root README](../../README.md).

## What lives here

- REST/JSON API at `/api/*` consumed by `apps/web` (Next.js).
- Auth: Laravel Fortify + Sanctum (SPA cookie mode) under `/auth/*` and `/sanctum/*`.
- Upload pipeline: `app/Services/UploadService.php` — sha256 dedupe, libvips
  variants, tag normalization, halal enforcement (`HalalGuard`).
- Moderation: `app/Http/Controllers/Api/Admin/*` gated by `EnsureAdmin` middleware.
- Discovery: `app/Http/Controllers/Api/DiscoveryController.php` — home, anime,
  characters, tags, search.
- Background jobs: Horizon-managed queue (catalog imports, achievements,
  notifications, tag GC).

## Quick start

From the repo root:

```bash
cp apps/api/.env.example apps/api/.env
cd apps/api
composer install
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8000
```

Full setup with prerequisites and troubleshooting:
[`docs/runbooks/local-dev.md`](../../docs/runbooks/local-dev.md).

## Tests + linting

```bash
vendor/bin/pint --test     # PHP code style (PSR-12 + Laravel conventions)
php artisan test           # PHPUnit
```

CI runs both on every PR — see [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

## License

[AGPL-3.0-only](../../LICENSE) — same as the rest of the project.
