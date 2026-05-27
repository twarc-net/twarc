-- twarc — required Postgres extensions.
-- Runs once on first container boot via the postgres image's
-- /docker-entrypoint-initdb.d hook.

CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- trigram autocomplete on tag names
CREATE EXTENSION IF NOT EXISTS btree_gin;   -- composite GIN for tag_ids + status
CREATE EXTENSION IF NOT EXISTS citext;      -- case-insensitive email / username
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid() in migrations
