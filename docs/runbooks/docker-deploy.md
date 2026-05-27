# Docker deployment

The fastest way to get twarc running on your own server. One command brings
up the whole stack: Postgres, Redis, Meilisearch, imgproxy, the Laravel API
with auto-HTTPS, Horizon, the scheduler, and Next.js.

For local dev (no Docker), see [`local-dev.md`](local-dev.md).

## Prerequisites

| Thing | Why |
|---|---|
| **A server with a public IP** | So Let's Encrypt can issue your TLS cert. Any VPS works — Hetzner, DigitalOcean, Vultr, Contabo. 2 vCPU / 4 GB RAM is plenty to start. |
| **A domain name** | Pointed at the server's IP via an `A` record. |
| **Ports 80 + 443 open** | Inbound, both TCP and UDP for HTTP/3 on 443. |
| **Docker Engine + Compose v2** | Install via [Docker's official script](https://docs.docker.com/engine/install/): `curl -fsSL https://get.docker.com \| sh`. |
| **8 GB free disk** | For images + database + uploads to grow into. |

## Five-minute setup

```bash
# 1. Clone
git clone https://github.com/twarc-net/twarc.git
cd twarc

# 2. Make sure the A record resolves to this server before continuing.
#    Caddy will try to issue a TLS cert immediately on startup; if DNS
#    isn't pointing here yet, the cert request will fail.

# 3. Configure
cp .env.docker.example .env
nano .env   # fill in SITE_URL, SERVER_NAME, SESSION_DOMAIN, secrets

# 4. Generate the secrets your .env needs
echo "APP_KEY=base64:$(openssl rand -base64 32)"
echo "DB_PASSWORD=$(openssl rand -hex 32)"
echo "MEILI_MASTER_KEY=$(openssl rand -hex 32)"
echo "IMGPROXY_KEY=$(openssl rand -hex 32)"
echo "IMGPROXY_SALT=$(openssl rand -hex 32)"

# 5. Build + start everything
docker compose -f docker-compose.prod.yml up -d --build

# 6. Watch it come up (Ctrl-C exits the tail; the stack keeps running)
docker compose -f docker-compose.prod.yml logs -f
```

First boot is ~3 minutes: image builds, migrations run, Caddy negotiates TLS
with Let's Encrypt. After that, restarts are ~10 seconds.

Then visit your `SITE_URL`. You should see the twarc landing page over HTTPS.

## Create the first admin

The `users` table starts empty. Register an account through the web UI at
`/register`, then promote it from the host:

```bash
docker compose -f docker-compose.prod.yml exec api \
    php artisan tinker --execute="\App\Models\User::where('username','YOUR_HANDLE')->update(['role'=>'admin']);"
```

Log out, log back in, and you'll see `/admin` in the nav.

## What's running

```
$ docker compose -f docker-compose.prod.yml ps

NAME                  IMAGE                              STATUS         PORTS
twarc-api-1           twarc-api:local                    Up (healthy)   0.0.0.0:80->80, 0.0.0.0:443->443
twarc-horizon-1       twarc-api:local                    Up (healthy)
twarc-imgproxy-1      darthsim/imgproxy:v3.27            Up
twarc-meilisearch-1   getmeili/meilisearch:v1.10         Up (healthy)
twarc-postgres-1      postgres:18-alpine                 Up (healthy)
twarc-redis-1         redis:7-alpine                     Up (healthy)
twarc-scheduler-1     twarc-api:local                    Up
twarc-web-1           twarc-web:local                    Up (healthy)
```

Only `api` is publicly exposed; everything else is on the internal Compose
network and unreachable from the outside.

## Updating

```bash
cd twarc
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

The api container re-runs migrations on startup, so schema updates are picked
up automatically. No downtime for code changes — Compose recreates containers
one at a time.

## Backups

Everything important lives in named volumes:

| Volume | What |
|---|---|
| `twarc_postgres_data` | The database. **Most important.** |
| `twarc_api_storage` | Uploaded fan art + tag covers. |
| `twarc_meilisearch_data` | Search index (rebuildable from Postgres, so not critical). |
| `twarc_caddy_data` | TLS certs (Caddy will re-issue if lost). |
| `twarc_redis_data` | Sessions + queue state. |

A daily backup script that handles Postgres + uploads:

```bash
#!/bin/sh
# /usr/local/sbin/twarc-backup
# Run via cron: 17 3 * * * /usr/local/sbin/twarc-backup
set -e
STAMP=$(date +%F_%H%M%S)
OUT=/var/backups/twarc

mkdir -p "$OUT"
cd /path/to/twarc

# Postgres dump
docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U twarc twarc | gzip > "$OUT/db-$STAMP.sql.gz"

# Uploaded files
docker run --rm \
    -v twarc_api_storage:/data:ro \
    -v "$OUT":/backup \
    alpine tar czf "/backup/uploads-$STAMP.tar.gz" -C /data .

# Keep last 14 days
find "$OUT" -type f -mtime +14 -delete
```

Restore:

```bash
# Database
gunzip < db-2026-05-27_031700.sql.gz | \
    docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U twarc twarc

# Uploads
docker run --rm \
    -v twarc_api_storage:/data \
    -v "$(pwd)":/backup \
    alpine sh -c "cd /data && tar xzf /backup/uploads-2026-05-27_031700.tar.gz"
```

## Common issues

### Caddy fails to get a TLS cert
You'll see `tls.obtain` errors in the api logs.

- DNS `A` record must resolve to this server's public IP. Check with
  `dig +short YOUR_DOMAIN`.
- Ports 80 + 443 must be reachable from the public internet (Let's Encrypt
  hits port 80 for the HTTP-01 challenge).
- If you're behind another proxy/firewall, set `SERVER_NAME=:80` and
  terminate TLS at the upstream proxy instead.

### `502` from Caddy on a few specific pages
Next.js may not be ready yet — first build takes a minute. Check
`docker compose logs web` for the "Ready" line.

### "could not translate host name 'postgres'"
Containers haven't joined the network yet. `docker compose down && up -d`
usually resolves it.

### Storage volume permission errors
The api entrypoint re-applies ownership on every boot, but if you mounted
a host directory instead of the named volume, make sure it's writable by
UID 33 (www-data inside the FrankenPHP image).

### Out of memory during `docker compose build`
Next.js build is memory-heavy. On a 2 GB box, add swap:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && \
mkswap /swapfile && swapon /swapfile
```

## Going beyond a single server

This compose is intentionally single-host. For real horizontal scale:

- **Storage**: swap the `api_storage` volume for Backblaze B2 — track in
  [issue #11](https://github.com/twarc-net/twarc/issues/11).
- **Variants on the fly**: have imgproxy serve from B2 with signed URLs —
  [issue #13](https://github.com/twarc-net/twarc/issues/13).
- **Search**: turn on Scout/Meilisearch indexing — [issue #7](https://github.com/twarc-net/twarc/issues/7).
- **DB**: managed Postgres (Hetzner / Neon / DO) when you outgrow a single
  box.

The compose works as-is up to ~thousands of daily uploads on a 4 GB box.
Past that, the bottleneck is usually image processing → move to B2 + imgproxy.

## Bringing it down

```bash
# Stop containers, keep volumes (you can up -d to resume)
docker compose -f docker-compose.prod.yml down

# Nuke everything including data — destructive
docker compose -f docker-compose.prod.yml down -v
```
