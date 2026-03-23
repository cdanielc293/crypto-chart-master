# VizionX – Self-hosted Docker Stack

Run the entire Supabase + VizionX backend on any machine with a single command.

## Quick Start

```bash
cd docker
cp .env.example .env
# Edit .env with your secrets (JWT_SECRET, POSTGRES_PASSWORD, ANON_KEY, SERVICE_ROLE_KEY)
docker compose up -d
```

## Services

| Service   | Internal URL          | External Port |
|-----------|-----------------------|---------------|
| Kong (API)| http://kong:8000      | 8000          |
| Postgres  | http://db:5432        | 5432          |
| GoTrue    | http://auth:9999      | (via Kong)    |
| PostgREST | http://rest:3000      | (via Kong)    |
| Realtime  | http://realtime:4000  | (via Kong)    |
| Storage   | http://storage:5000   | (via Kong)    |
| Studio    | http://studio:3000    | 3001          |

## Frontend Configuration

Set your frontend `.env` to:

```
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=<your anon key>
```

For production with a reverse proxy (e.g., https://api.vizionx.pro), update `API_EXTERNAL_URL` and `SITE_URL` accordingly.

## Database

The database schema is automatically applied on first boot via `volumes/db/init/00-schema.sql`. This includes all tables, RLS policies, functions, and triggers.

## OAuth

Configure Google/Apple OAuth by filling in the respective variables in `.env`. The redirect URI will be `{API_EXTERNAL_URL}/auth/v1/callback`.
