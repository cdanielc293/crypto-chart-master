#!/bin/bash
###############################################################################
# Sync internal DB roles + public schema privileges for zero-config startup.
# Runs automatically on first boot via docker-entrypoint-initdb.d
###############################################################################
set -euo pipefail

DB_BOOTSTRAP_USER="${POSTGRES_USER:-postgres}"
DB_BOOTSTRAP_DB="${POSTGRES_DB:-postgres}"

psql -v ON_ERROR_STOP=1 --username "$DB_BOOTSTRAP_USER" --dbname "$DB_BOOTSTRAP_DB" <<-EOSQL
  DO \$\$
  BEGIN
    -- Ensure roles exist (guard against edge cases on clean machines)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
      CREATE ROLE authenticator NOINHERIT LOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
      CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
      CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
      CREATE ROLE supabase_storage_admin NOINHERIT CREATEROLE LOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
      CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS;
    END IF;
  END
  \$\$;

  -- Set all internal login-role passwords to one shared secret
  ALTER ROLE authenticator          WITH PASSWORD '${POSTGRES_PASSWORD}';
  ALTER ROLE supabase_auth_admin    WITH PASSWORD '${POSTGRES_PASSWORD}';
  ALTER ROLE supabase_storage_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
  ALTER ROLE supabase_admin         WITH PASSWORD '${POSTGRES_PASSWORD}';

  -- Role memberships required by PostgREST and service bootstrapping
  GRANT anon          TO authenticator;
  GRANT authenticated TO authenticator;
  GRANT service_role  TO authenticator;

  -- Avoid hard-coded grantee names like "postgres" (can differ by image/env)
  DO \$\$
  BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_BOOTSTRAP_USER}') THEN
      EXECUTE format('GRANT supabase_auth_admin TO %I', '${DB_BOOTSTRAP_USER}');
      EXECUTE format('GRANT supabase_storage_admin TO %I', '${DB_BOOTSTRAP_USER}');
    END IF;
  END
  \$\$;

  -- Explicit public schema permissions for zero-manual setup
  GRANT ALL ON SCHEMA public TO public;
  ALTER SCHEMA public OWNER TO supabase_admin;
  GRANT USAGE, CREATE ON SCHEMA public TO supabase_auth_admin, supabase_storage_admin, authenticator;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supabase_admin;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO supabase_admin;
  GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO supabase_admin;
EOSQL

echo "✅ Internal roles + public schema permissions synced"
