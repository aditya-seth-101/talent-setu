# TODO

- After reinstalling dependencies (`npm install --workspaces`), rerun `npm run dev:all` and confirm every service boots without MongoDB or Turbopack warnings.
- If you have a dedicated MongoDB instance, set `USE_MEMORY_MONGO=false` in `backend/api/.env` and point `MONGODB_URI` at it to disable the fallback server.
- Verify a macOS teammate can run `npm run dev:learning` and `npm run dev:recruitment` (the optional SWC binaries should avoid further lockfile patching or `pnpm` probing).
