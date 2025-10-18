# Talent-Setu monorepo

This repository is organized as a monorepo. Key setup notes:

- Backend services live in `backend/` (`api`, `ai-service`, `judge-service`).
- Frontend applications are under `frontend/` (admin, assessment, learning, recruitment).
- NPM workspaces manage dependencies; run commands from the repo root.

## Getting started

```bash
 Developer notes
 ---------------

 If you run into startup issues on Windows or macOS:

 - The API will try to start an in-memory MongoDB instance automatically when `MONGODB_URI` is unreachable. To disable that behavior set `USE_MEMORY_MONGO=false` in `backend/api/.env` and provide `MONGODB_URI`.
 - If any frontend complains about missing SWC binaries, run `npm install` at the repo root to ensure optional platform-specific `@next/swc-*` packages are installed.
 - If ports are already in use, identify and kill the processes using `netstat -ano` and `taskkill /PID <pid> /F` on Windows.
```

Make sure MongoDB (port 27017) and Redis (port 6379) are running locally before starting the services—install them locally or use a managed/cloud instance. Use the workspace scripts to run local dev servers. For fast iteration run `npm run dev:all` at the repo root (or run individual services with `npm run dev:api`, `npm run dev:admin`, etc.).

## Documentation

- Build roadmap: `docs/copilot_gpt_5_codex_build_plan.md`
- Delivery log: `docs/progress.md`
- Environment & secrets reference: `docs/environment-secrets.md`

Centralized `.gitignore` rules live at the repository root. Historical per-package rules remain under `.gitignore-backups/` if needed.
