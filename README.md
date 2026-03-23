<p align="center">
  <h1 align="center">VizionX</h1>
  <p align="center">Professional crypto charting platform — TradingView-grade tools, self-hosted.</p>
</p>

---

## Prerequisites

| Tool | Version |
|------|---------|
| [Docker](https://docs.docker.com/get-docker/) | ≥ 24.0 |
| [Docker Compose](https://docs.docker.com/compose/install/) | ≥ 2.20 (included with Docker Desktop) |
| [Git](https://git-scm.com/) | any |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_ORG/vizionx.git
cd vizionx/docker

# 2. Create your environment file
cp .env.example .env

# 3. Start everything
docker compose up -d
```

That's it. On a clean machine, all backend services bootstrap automatically with no manual SQL setup.

---

## Service Map

| Service | Description | Internal Address | External Port |
|---------|-------------|-----------------|---------------|
| **Kong** | API Gateway | `http://kong:8000` | `8000` |
| **PostgreSQL** | Database | `http://db:5432` | `5432` |
| **GoTrue** | Authentication | `http://auth:9999` | via Kong |
| **PostgREST** | REST API | `http://rest:3000` | via Kong |
| **Realtime** | WebSocket subscriptions | `http://realtime:4000` | via Kong |
| **Storage** | File storage | `http://storage:5000` | via Kong |
| **Studio** | Admin dashboard | `http://studio:3000` | `3001` |

### Key URLs (after `docker compose up`)

| What | URL |
|------|-----|
| API Gateway | `http://127.0.0.1:8000` |
| Studio Dashboard | `http://127.0.0.1:8001` |
| Database (direct) | `127.0.0.1:5432` |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Docker Network                  │
│                   "vizionx"                      │
│                                                  │
│  ┌──────┐   ┌──────┐   ┌──────────┐   ┌──────┐ │
│  │  DB  │◄──│ Auth │   │PostgREST │   │ Meta │ │
│  │ :5432│   │ :9999│   │  :3000   │   │ :8080│ │
│  └──┬───┘   └──┬───┘   └────┬─────┘   └──┬───┘ │
│     │          │            │             │      │
│     └──────────┴────────────┴─────────────┘      │
│                       │                          │
│                  ┌────┴────┐                     │
│                  │  Kong   │ ◄── :8000 (public)  │
│                  │ Gateway │                     │
│                  └─────────┘                     │
└─────────────────────────────────────────────────┘
```

All inter-service traffic uses Docker DNS (service names), while exposed host ports are bound to `127.0.0.1` for local-only access.

---

## Environment Variables

See [`docker/.env.example`](docker/.env.example) for the full list. Critical variables:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Single password used by **all** services |
| `JWT_SECRET` | Shared JWT signing secret (min 32 chars) |
| `ANON_KEY` | Supabase anonymous JWT |
| `SERVICE_ROLE_KEY` | Supabase service-role JWT |
| `SITE_URL` | Frontend URL for auth redirects (default: `http://127.0.0.1:3000`) |
| `API_EXTERNAL_URL` | API URL for OAuth callbacks (default: `http://127.0.0.1:8000`) |

---

## Database

The database is fully bootstrapped on first boot:

- **`docker/volumes/db/init/00-roles.sh`** — Creates and syncs all Supabase internal role passwords to `POSTGRES_PASSWORD`
- **`docker/volumes/db/init/01-schema.sql`** — Creates all tables, RLS policies, functions, and triggers

No manual `ALTER USER` or migration steps required.

---

## OAuth Setup

1. Set `ENABLE_GOOGLE_AUTH=true` in `.env`
2. Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. The redirect URI is `{API_EXTERNAL_URL}/auth/v1/callback`
4. Restart: `docker compose restart auth`

Same pattern applies for Apple OAuth.

---

## Frontend Configuration

Point your frontend `.env` at the local gateway:

```env
VITE_SUPABASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_PUBLISHABLE_KEY=<your ANON_KEY>
```

The current codebase already includes local defaults, so this file is optional for local startup.

---

## Common Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f auth

# Restart a service
docker compose restart auth

# Stop everything
docker compose down

# Stop and remove all data
docker compose down -v
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `password authentication failed` | Ensure `POSTGRES_PASSWORD` is set in `.env` and run `docker compose down -v && docker compose up -d` to reset |
| Auth service won't start | Check `docker compose logs auth` — usually a DB connection issue |
| Studio can't connect | Verify `POSTGRES_PASSWORD` matches and Meta service is healthy |
| OAuth redirect fails | Confirm `API_EXTERNAL_URL` matches your public URL |

---

## License

Proprietary — VizionX © 2024
