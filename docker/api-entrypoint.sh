#!/bin/sh
#
# twarc API container entrypoint.
# Runs once per container start:
#   1. Wait for Postgres to be reachable.
#   2. Run pending migrations.
#   3. Warm Laravel's config / route / view caches.
#   4. Hand off to whatever was passed as CMD (frankenphp run / artisan horizon / …).
#
# Safe to run multiple times — every step is idempotent.

set -e

cd /app

# ---- 1. Wait for Postgres ----
echo "→ waiting for Postgres at ${DB_HOST:-postgres}:${DB_PORT:-5432}"
ATTEMPTS=0
until php -r "new PDO('pgsql:host=${DB_HOST:-postgres};port=${DB_PORT:-5432};dbname=${DB_DATABASE:-twarc}', '${DB_USERNAME:-twarc}', getenv('DB_PASSWORD'));" 2>/dev/null; do
    ATTEMPTS=$((ATTEMPTS+1))
    if [ "$ATTEMPTS" -gt 60 ]; then
        echo "✗ Postgres unreachable after 60s — giving up." >&2
        exit 1
    fi
    sleep 1
done
echo "✓ Postgres ready"

# ---- 2. Migrations (only on the main api container, not on horizon/scheduler) ----
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "→ running migrations"
    php artisan migrate --force --no-interaction
fi

# ---- 3. Cache warm-up ----
echo "→ caching config / routes / events"
php artisan config:cache
php artisan route:cache
php artisan event:cache

# Ensure storage is owned correctly (volume mount may reset ownership).
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

echo "→ launching: $*"
exec "$@"
