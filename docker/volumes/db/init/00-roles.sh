#!/bin/bash
###############################################################################
# Sync all Supabase internal role passwords to $POSTGRES_PASSWORD
# Runs automatically on first boot via docker-entrypoint-initdb.d
###############################################################################
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    -- Ensure roles exist (supabase/postgres image usually creates them,
    -- but we guard against edge cases)
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

  -- Set ALL role passwords to the single shared POSTGRES_PASSWORD
  ALTER ROLE authenticator        WITH PASSWORD '${POSTGRES_PASSWORD}';
  ALTER ROLE supabase_auth_admin  WITH PASSWORD '${POSTGRES_PASSWORD}';
  ALTER ROLE supabase_storage_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
  ALTER ROLE supabase_admin       WITH PASSWORD '${POSTGRES_PASSWORD}';

  -- Grant necessary role memberships
  GRANT anon          TO authenticator;
  GRANT authenticated TO authenticator;
  GRANT service_role  TO authenticator;
  GRANT supabase_auth_admin TO postgres;
  GRANT supabase_storage_admin TO postgres;
EOSQL

echo "✅ All Supabase roles synced to POSTGRES_PASSWORD"
