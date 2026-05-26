# Local development

Step-by-step setup with troubleshooting. The five-line version is in the
[root README](../../README.md#quickstart--local-dev).

## Prerequisites

| Tool | Minimum | Notes |
|---|---|---|
| PHP | 8.3 | 8.5 works too; extensions: `mbstring intl pdo_pgsql redis gd bcmath zip curl xml` |
| Composer | 2 | |
| Node | 20 | 22 recommended |
| pnpm | 11 | `npm i -g pnpm` if you don't have it |
| Postgres | 15 | 16+ recommended (we use 18 in prod) |
| Redis | 7 | for cache + queue + sessions |
| Docker | any recent | for Meilisearch + imgproxy |

## 1. Clone + workspace install

```bash
git clone https://github.com/twarc-net/twarc.git
cd twarc
pnpm install
```

## 2. Postgres + Redis

If you don't have them yet, install with your package manager. On Ubuntu:

```bash
sudo apt install postgresql postgresql-contrib redis-server
sudo systemctl enable --now postgresql redis-server
```

Create the database and user:

```bash
sudo -u postgres psql -c "CREATE USER twarc WITH PASSWORD 'twarc';"
sudo -u postgres psql -c "CREATE DATABASE twarc OWNER twarc;"
sudo -u postgres psql twarc -c "
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE EXTENSION IF NOT EXISTS btree_gin;
  CREATE EXTENSION IF NOT EXISTS citext;
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
"
```

## 3. Meilisearch + imgproxy (Docker)

```bash
cp infra/docker/.env.example infra/docker/.env

# Generate three strong secrets and paste them into the .env:
openssl rand -hex 32   # MEILI_MASTER_KEY
openssl rand -hex 32   # IMGPROXY_KEY
openssl rand -hex 32   # IMGPROXY_SALT

docker compose -f infra/docker/compose.dev.yml --env-file infra/docker/.env up -d
docker compose -f infra/docker/compose.dev.yml ps   # both should be "healthy"
```

## 4. Laravel API

```bash
cd apps/api
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8000
```

Optional in another shell: `php artisan horizon` to run background jobs (image
re-encoding, achievements, notifications).

## 5. Next.js web

In a new shell, from the repo root:

```bash
cd apps/web
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000>. Login at `/login` after registering at `/register`.

## Common issues

### `SQLSTATE[08006] could not translate host name`
Postgres isn't running, or `DB_HOST` in `apps/api/.env` is wrong. Default is
`127.0.0.1`. Check with `sudo systemctl status postgresql`.

### `Class "Redis" not found`
PHP's `redis` extension is missing. On Ubuntu: `sudo apt install php8.3-redis`.

### `419 page expired` on login
CSRF cookie missing. The web client at `apps/web/lib/api.ts` calls
`/sanctum/csrf-cookie` automatically before every state-changing request — if
this fails, your `APP_URL` (Laravel) and `NEXT_PUBLIC_API_URL` (Next) probably
point at different hosts. They must share an effective domain for cookies.

### Images don't load locally
The Laravel API serves `/storage/*` from `apps/api/storage/app/public/`. Make
sure you ran `php artisan storage:link` (creates `apps/api/public/storage` →
`apps/api/storage/app/public`).

### `Connection refused` to Meilisearch / imgproxy
Docker containers aren't up.
`docker compose -f infra/docker/compose.dev.yml ps` — both should be running.
Restart with `docker compose -f infra/docker/compose.dev.yml restart`.

## Useful commands

```bash
# Reset the DB cleanly
cd apps/api && php artisan migrate:fresh --seed

# Watch Laravel logs in pretty format
cd apps/api && php artisan pail

# Run linters before pushing
cd apps/api && vendor/bin/pint        # PHP
cd apps/web && pnpm lint              # JS/TS
cd apps/web && npx tsc --noEmit       # type check

# Run tests
cd apps/api && php artisan test
```

## Production deployment

See [`docs/runbooks/production.md`](production.md) for the nginx + systemd
recipe we run on twarc.net.
