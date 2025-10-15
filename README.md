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

Make sure MongoDB (port 27017) and Redis (port 6379) are running locally before starting the services—most contributors install them via Homebrew or run them from a managed instance. The `npm run dev:all` script is handy for launching every backend watcher once your databases are reachable. Docker Compose support has been retired; the stub `docker-compose.yml` file only exists to point folks back to these scripts.

## Documentation

- Build roadmap: `docs/copilot_gpt_5_codex_build_plan.md`
- Delivery log: `docs/progress.md`
- Environment & secrets reference: `docs/environment-secrets.md`

Centralized `.gitignore` rules live at the repository root. Historical per-package rules remain under `.gitignore-backups/` if needed.
