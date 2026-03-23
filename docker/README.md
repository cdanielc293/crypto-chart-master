# VizionX – Self-hosted Docker Stack

Run the entire Supabase + VizionX backend on any machine with a single command.

## Quick Start

```bash
cd docker
cp .env.example .env
docker compose up -d
```

No additional SQL steps or manual database fixes are required.

## Services

| Service   | Internal URL          | External Port |
|-----------|-----------------------|---------------|
| Kong (API)| http://kong:8000      | 8000          |
| Postgres  | http://db:5432        | 5432          |
| GoTrue    | http://auth:9999      | (via Kong)    |
| PostgREST | http://rest:3000      | (via Kong)    |
| Realtime  | http://realtime:4000  | (via Kong)    |
| Storage   | http://storage:5000   | (via Kong)    |
| Studio    | http://studio:3000    | 8001          |

All published ports are bound to `127.0.0.1` for local-only access.

## Frontend Configuration

Set your frontend `.env` to:

```
VITE_SUPABASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_PUBLISHABLE_KEY=<your anon key>
```

The app code already includes these local defaults, so this file is optional.

For production with a reverse proxy (e.g., `https://vizionx.pro`), override `API_EXTERNAL_URL` and `SITE_URL` in `docker/.env`.

## Database

The database bootstrap runs automatically on first boot:

- `volumes/db/init/00-roles.sh` creates required internal roles, syncs passwords, and grants schema/object permissions.
- `volumes/db/init/01-schema.sql` creates the schema, RLS policies, functions, and triggers.

## OAuth

Configure Google/Apple OAuth by filling in the respective variables in `.env`. The redirect URI will be `{API_EXTERNAL_URL}/auth/v1/callback`.
