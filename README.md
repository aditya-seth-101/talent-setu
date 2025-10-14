# Talent-Setu monorepo

This repository is organized as a monorepo. Key setup notes:

- Backend services live in `backend/` (`api`, `ai-service`, `judge-service`).
- Frontend applications are under `frontend/` (admin, assessment, learning, recruitment).
- NPM workspaces manage dependencies; run commands from the repo root.

## Getting started

```bash
npm install
npm run dev:api        # Express API (port 4000)
npm run dev:ai         # AI orchestration service (port 4100)
npm run dev:judge      # Judge0 adapter (port 4200)
npm run seed:api       # Seed base data (requires MongoDB)
```

To spin up MongoDB, Redis, and all backend services via Docker Compose:

```bash
docker compose up --build
```

Each backend service includes a `.env.docker` file with container-friendly defaults. Copy it to `.env` if you need overrides or secrets specific to your environment.

## Documentation

- Build roadmap: `docs/copilot_gpt_5_codex_build_plan.md`
- Delivery log: `docs/progress.md`

Centralized `.gitignore` rules live at the repository root. Historical per-package rules remain under `.gitignore-backups/` if needed.
