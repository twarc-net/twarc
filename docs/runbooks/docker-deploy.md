# Docker deployment

The fastest way to get twarc running on your own server. One command brings
up the whole stack: Postgres, Redis, Meilisearch, imgproxy, the Laravel API
with auto-HTTPS, Horizon, the scheduler, and Next.js.

For local dev (no Docker), see [`local-dev.md`](local-dev.md).

## Two ways to deploy

| | **Pulled images** (default — `docker-compose.yml`) | **Built from source** (`docker-compose.build.yml`) |
|---|---|---|
| First boot | **~90 seconds** (just pulls multi-arch images) | ~5 minutes (builds api + web) |
| Server requirements | Docker only | Docker + memory headroom for the Next.js build (~2 GB RAM during build) |
| What changes when you `git pull` | Nothing — pin a tag with `TWARC_VERSION=v0.1.1` | Rebuilds the affected images |
| When to use | Self-hosting any tagged release | Forking, debugging, air-gapped servers |

Both produce the same runtime stack. The rest of this guide uses the default.

## Prerequisites

| Thing | Why |
|---|---|
| **A server with a public IP** | So Let's Encrypt can issue your TLS cert. Any VPS works — Hetzner, DigitalOcean, Vultr, Contabo. 2 vCPU / 2 GB RAM is plenty when pulling images. |
| **A domain name** | Pointed at the server's IP via an `A` record. |
| **Ports 80 + 443 open** | Inbound, both TCP and UDP for HTTP/3 on 443. |
| **Docker Engine + Compose v2** | Install via Docker's official script: `curl -fsSL https://get.docker.com \| sh`. |
| **5 GB free disk** | For images + database + uploads to grow into. |

## Quick start (pulled images)

```bash
# 1. Clone (we only need the compose + Caddyfile, not the source)
git clone --depth=1 https://github.com/twarc-net/twarc.git
cd twarc

# 2. Make sure the A record resolves to this server before continuing.
#    Caddy will request a TLS cert immediately on startup; if DNS isn't
#    pointing here yet, the cert request will fail (it'll retry though).
dig +short YOUR_DOMAIN   # should print your server's public IP

# 3. Configure
cp .env.docker.example .env
nano .env   # fill in SITE_URL, SERVER_NAME, SESSION_DOMAIN, secrets

# 4. Generate the secrets the .env needs
cat <<EOF >> .env
APP_KEY=base64:$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -hex 32)
MEILI_MASTER_KEY=$(openssl rand -hex 32)
IMGPROXY_KEY=$(openssl rand -hex 32)
IMGPROXY_SALT=$(openssl rand -hex 32)
EOF

# 5. Pull + start
docker compose --env-file .env pull
docker compose --env-file .env up -d

# 6. Watch it come up (Ctrl-C exits the tail; the stack keeps running)
docker compose logs -f
```

First boot is ~90 seconds (image pulls + migrations + Caddy negotiating TLS
with Let's Encrypt). After that, restarts are ~10 seconds.

Then visit your `SITE_URL`. You should see the twarc landing page over HTTPS.

### Pin a specific version

`latest` follows the most recent tagged release. To lock to a specific tag,
add to `.env`:

```
TWARC_VERSION=v0.1.1
```

Then `docker compose pull && up -d` again to switch.

## Build from source instead

If you're forking or want to ship local changes, swap the file flag:

```bash
docker compose -f docker-compose.build.yml --env-file .env up -d --build
```

Every subsequent command needs the same `-f docker-compose.build.yml`.

## Create the first admin

The `users` table starts empty. Register an account through the web UI at
`/register`, then promote it from the host:

```bash
docker compose exec api \
    php artisan tinker --execute="\App\Models\User::where('username','YOUR_HANDLE')->update(['role'=>'admin']);"
```

Log out, log back in, and you'll see `/admin` in the nav.

## What's running

```
$ docker compose ps

NAME                  IMAGE                                         STATUS         PORTS
twarc-api-1           ghcr.io/twarc-net/twarc-api:latest            Up (healthy)   0.0.0.0:80->80, 0.0.0.0:443->443
twarc-horizon-1       ghcr.io/twarc-net/twarc-api:latest            Up (healthy)
twarc-imgproxy-1      darthsim/imgproxy:v3.27                       Up
twarc-meilisearch-1   getmeili/meilisearch:v1.10                    Up (healthy)
twarc-postgres-1      postgres:18-alpine                            Up (healthy)
twarc-redis-1         redis:7-alpine                                Up (healthy)
twarc-scheduler-1     ghcr.io/twarc-net/twarc-api:latest            Up
twarc-web-1           ghcr.io/twarc-net/twarc-web:latest            Up (healthy)
```

Only `api` is publicly exposed; everything else is on the internal Compose
network and unreachable from the outside.

## Updating

### Pulled images
```bash
cd twarc
git pull                              # only if compose / .env changed
docker compose pull                   # grab the latest published images
docker compose up -d                  # recreate containers with the new images
```

Schema updates run automatically on `api` container start.

### Built from source
```bash
cd twarc
git pull
docker compose -f docker-compose.build.yml up -d --build
```

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
docker compose exec -T postgres \
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
    docker compose exec -T postgres \
    psql -U twarc twarc

# Uploads
docker run --rm \
    -v twarc_api_storage:/data \
    -v "$(pwd)":/backup \
    alpine sh -c "cd /data && tar xzf /backup/uploads-2026-05-27_031700.tar.gz"
```

## Image provenance

Every published image at `ghcr.io/twarc-net/twarc-{api,web}` ships with:

- **SBOM** (software bill of materials) attached to the manifest.
- **Build provenance** (SLSA-style) signed via GitHub's OIDC.

Verify with:

```bash
gh attestation verify oci://ghcr.io/twarc-net/twarc-api:latest \
    --owner twarc-net
```

(Requires the `gh` CLI.) A clean verify proves the image was built by the
[`publish-images.yml`](../../.github/workflows/publish-images.yml) workflow
in this repo — not tampered with downstream.

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
Next.js may not be ready yet — first start takes ~30 seconds. Check
`docker compose logs web` for the "Ready" line.

### "could not translate host name 'postgres'"
Containers haven't joined the network yet. `docker compose down && up -d`
usually resolves it.

### Storage volume permission errors
The api entrypoint re-applies ownership on every boot, but if you mounted
a host directory instead of the named volume, make sure it's writable by
UID 33 (www-data inside the FrankenPHP image).

### Out of memory during `docker compose build`
Only affects the build variant. Next.js build is memory-heavy. On a 2 GB
box, add swap:

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
docker compose down

# Nuke everything including data — destructive
docker compose down -v
```
