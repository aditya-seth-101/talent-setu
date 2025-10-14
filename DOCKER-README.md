# Docker quickstart — Talent Setu

A short guide to get the project running locally using Docker Compose.

Prerequisites

- Docker Desktop (macOS) installed and running.
- Git (to clone repository).
- (Optional) Node.js + npm if you prefer to run seed scripts locally.

Quick start (recommended)

1. Clone the repo and cd into it:

```bash
git clone <repo-url> talent-setu
cd talent-setu
```

2. Build and start the development stack (mongo, redis, api, ai-service, judge-service):

```bash
# from repo root
docker compose up --build -d
```

3. Check running containers and logs

```bash
# list containers for this compose project
docker compose ps

# follow logs for all services
docker compose logs -f

# view logs for a single service (example: api)
docker compose logs -f api
```

Environment files

- The services ship with container-friendly presets named `.env.docker` (e.g. `backend/api/.env.docker`).
- `docker-compose.yml` is already configured to use those `.env.docker` files; you can copy them to `.env` for local overrides if you want to persist changes:

```bash
cp backend/api/.env.docker backend/api/.env
cp backend/ai-service/.env.docker backend/ai-service/.env
cp backend/judge-service/.env.docker backend/judge-service/.env
```

Seeding the database

- The easiest (host) approach is to run the seed script from your machine (requires Node + npm installed):

```bash
# from repo root
npm install
npm run seed:api
```

- If you prefer to run the seed inside a container (one-off), you can run:

```bash
# will install dependencies in a temporary container and run the seed script
docker compose run --rm api sh -c "npm install && npm run seed"
```

Health checks (quick)

- API: http://localhost:4000/api/health
- AI: http://localhost:4100/
- Judge: http://localhost:4200/

Stopping and cleaning up

```bash
# stop and remove containers, networks
docker compose down

# remove volumes (data) as well
docker compose down -v
```

Troubleshooting

- "Cannot connect to Docker daemon": start Docker Desktop and try again.
- If any service exits quickly, check its logs (`docker compose logs <service>`). Common causes:
  - Environment validation errors (see `backend/*/.env.docker`).
  - Missing dev-only tools when running scripts inside runtime images (use the one-off `docker compose run` approach above).
- If you change `.env.docker` files, restart the affected service or run `docker compose up -d --build`.

Next steps

- Run the seed step, then open `http://localhost:4000/api/health` to verify the API is working.
- For development, you may prefer running services locally (npm run dev) instead of via Docker for faster edit/test cycles.

If you want, I can add Docker `healthcheck` entries to `docker-compose.yml` and a simple smoke-test script to automatically validate the stack after `up`.
