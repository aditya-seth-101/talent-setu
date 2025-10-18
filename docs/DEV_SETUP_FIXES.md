# Development setup fixes (applied)

This file documents the fixes I applied to make `npm run dev:all` work reliably on Windows and macOS developer machines, and how to customize or revert them.

Summary of changes

- Next.js Turbopack configuration

  - `frontend/learning/next.config.ts` and `frontend/recruitment/next.config.ts` now set `turbopack.root` explicitly to the repo root using `path.resolve(__dirname, '../../')`. This prevents Next.js from inferring the wrong workspace root when stray lockfiles exist in the user or repo parent directories.

- SWC platform binaries

  - The `frontend/*` apps now declare platform-specific `@next/swc-*` packages under `optionalDependencies`. This allows npm to install the correct SWC native binding for the current platform (Windows macOS Linux) without forcing a single platform package in `dependencies`.
  - The frontends also include a `packageManager` field to hint Next.js that `npm` is the package manager, avoiding pnpm probing in many cases.

- pnpm lockfiles and workspace detection

  - I removed local `pnpm-lock.yaml` files that were present under some packages and added `**/pnpm-lock.yaml` to `.gitignore` so Next.js/Turbopack does not pick up the wrong lockfile and attempt to patch it.
  - If your team uses `pnpm` as the canonical package manager, revert the removal and add a `pnpm-workspace.yaml` at repo root instead.

- In-memory MongoDB fallback for development
  - `backend/api`:
    - Added `mongodb-memory-server` as a dev/runtime optional dependency and implemented a fallback in `src/services/database.ts`: if `MONGODB_URI` cannot be reached within `MONGODB_CONNECT_TIMEOUT_MS`, the service will start an in-memory MongoDB instance automatically (only enabled by default for non-production environments).
    - New environment variables (documented in `.env.example`):
      - `MONGODB_CONNECT_TIMEOUT_MS` (default 5000)
      - `USE_MEMORY_MONGO` (defaults to `true` in non-production; set to `false` to always require a real MongoDB instance)

Why this helps

- Developers who don't run MongoDB locally will no longer block the API service startup; it will bring up a temporary in-memory server.
- Next.js stops spamming `pnpm` registry checks and lockfile patching messages caused by mixed lockfiles.
- Frontend apps will select the correct SWC binaries on macOS and Windows without extra manual steps.

How to use

1. Install all dependencies (recommended):

```cmd
npm install --workspaces
```

2. Run the full dev stack:

```cmd
npm run dev:all
```

3. If you prefer to always use a real MongoDB instance (recommended for integration testing), set in `backend/api/.env`:

```
MONGODB_URI=mongodb://localhost:27017/talent-setu
USE_MEMORY_MONGO=false
```

4. If Next.js still warns about an inferred root because you keep a `pnpm-lock.yaml` in your home dir (or elsewhere), either remove that lockfile or set `turbopack.root` in your app's `next.config.ts` to the desired root directory.

Troubleshooting notes

- If services still show EADDRINUSE errors, another process is using the port. List and kill processes using those ports (Windows):

```cmd
netstat -ano | findstr ":3000"
taskkill /PID <PID> /F
```

- If Next.js prints a message asking you to run `npm install` after "Lockfile was successfully patched", run `npm install` in the workspace root to make sure optional SWC binaries are downloaded.

- If you see many `npm ERR! Missing script: "dev"` messages from `concurrently`, those are noisy and often appear when `concurrently` spawns the root-level script which in turn spawns workspace npm scripts. The important indicator is whether the services themselves start (look for "listening" or "Ready in" logs).

Files changed

- `.gitignore` (added `**/pnpm-lock.yaml`)
- `frontend/learning/next.config.ts` (set turbopack.root)
- `frontend/recruitment/next.config.ts` (set turbopack.root)
- `frontend/learning/package.json` (optional SWC binaries + packageManager)
- `frontend/recruitment/package.json` (optional SWC binaries + packageManager)
- `backend/api/src/services/database.ts` (MongoDB fallback)
- `backend/api/src/config/env.ts` (new env vars and USE_MEMORY_MONGO handling)
- `backend/api/.env.example` (document new vars)

If you'd like, I can now:

- Add a short section into the root `README.md` with these quick steps (I will do this next),
- Or switch to cleaning up any remaining console noise (like suppressing the "Missing script" messages) — say which you'd prefer.
