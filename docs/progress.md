# Talent Setu — Delivery Progress

_Last updated: 2025-10-17_

Maintainer review: 2025-10-16 — reviewed; added local verification steps and quick smoke-test commands to help contributors validate the learning flow locally.

## Sprint 0 (Project setup)

- [x] Monorepo structure aligned with build plan
- [x] Backend services scaffolded (API, AI, Judge)
- [x] Local backend services verified together (api 4000, ai-service 4100, judge-service 4200) with MongoDB (27017) and Redis (6379) running via Homebrew services.
- [x] CI pipeline skeleton
- [x] Seed data scripts

## Sprint 1 (Auth & Core Models)

- [x] Authentication service with signup/login/refresh, session rotation, and email verification lifecycle
- [x] RBAC data seeded (roles + technologies) with guardrails against self-assigning privileged roles
- [x] Users & profiles stored in MongoDB with self-service profile CRUD endpoints and recruiter search filters
- [x] Next.js learning shell wired to API (signup/login/logout, session cookies, protected dashboard)

## Sprint 2 (Course model + Monaco skeleton)

- [x] Courses, topics, and challenges models with repositories/services in the API layer
- [x] Judge attempt tracking persisted with callback handling from judge-service
- [x] `/api/judge/submissions` endpoint proxying judge-service and surfacing attempt polling
- [x] Next.js Monaco wrapper + sample page wired to Judge submission flow (run + poll)

## Sprint 3 (AI course generation + admin UI)

- [x] Persist AI-generated outlines for admin review workflow (promote draft ➜ published)
- [x] Connect AI service prompt orchestration and schema validation to course creation endpoints
- [x] Build admin review UI for generated courses (approve, request changes, publish)
- [x] Document and seed required external secrets (OPENAI_API_KEY, JUDGE0_API_KEY, SMTP creds) across local + CI environments

## Sprint 4 (Learning flows + gating)

- [ ] Learning topic view surfaces gate challenge entry points with progress state awareness
- [ ] Gate validation service updates `profiles.learningProgress` and enforces unlock rules
- [ ] Editor hint pipeline connects Judge0 attempt failures to AI hint generation with rate limiting
- [ ] Learning UI renders hint requests and logs usage penalties
- [ ] Baseline leaderboard API + UI showing top learners per technology

## Sprint 5 (Assessment builder & execution)

- [x] Assessment template domain model, repository, and secured API endpoints for recruiters/admins
- [x] Unique question generator wired to AI service with JSON-schema validation per phase
- [x] Assessment creation flow generates seeded phase instances with Judge0 linking
- [x] Voice phase transcription persistence with automated AI scoring (proctor review UI pending)
- [x] Candidate dashboard UX for starting assessments and reviewing attempt history
- [x] Automated regression coverage for assessment services (unit + integration)


## Sprint 6 (Recruitment marketplace)

- [x] Recruiter talent search API with aggregated assessment credibility metrics
- [x] Talent profile detail endpoint combining assessment history and technology tags
- [x] Recruiter dashboard UI wiring to new backend endpoints
- [~] Technology directory request + approval workflow (API complete; admin UI pending)
  - Added admin dashboard tab for technology approvals with search, submission, and review tooling (approval UI in place; recruiter autocomplete integration live).

### Sprint 4 — Recent progress (2025-10-15)

- [x] Fixed backend learning service type and lint issues that blocked builds:
  - Resolved TypeScript nullability on `profile` in `loadLearningState` to avoid runtime/compile-time null access when updating `profiles.learningProgress`.
  - Removed several unused variables and tightened signatures in `progress.service.ts` to satisfy ESLint and improve maintainability.
  - Cleaned up admin controller (`admin.course.controller.ts`) to avoid unsafe `any` casts and removed unused imports.
- [x] Verified TypeScript build for `backend/api` completes and ESLint reports only style warnings.
- [ ] Frontend learning app: pending verification

  - `frontend/learning` requires `pnpm install` locally to run ESLint/build; once installed, run `pnpm run lint` and `pnpm dev` to test the learning flows (courses -> topic workspace -> hint requests -> gate completion).
  - End-to-end tests for hint generation require the `ai-service` to be running and `OPENAI_API_KEY` configured in `.env` or a local mock.

Maintainer quick checks (local)

- From repository root, install frontend deps (if using pnpm workspace) or install per-package:

```bash
# If using pnpm workspaces (recommended)
pnpm install

# Or install only the learning frontend deps
cd frontend/learning
pnpm install
```

- Start backend API and ai-service (examples; run in separate terminals):

```bash
# from repo root - adjust package scripts if needed
cd backend/api
pnpm run dev

cd backend/ai-service
pnpm run dev
```

- Start the learning frontend:

```bash
cd frontend/learning
pnpm dev
```

- Quick smoke checks (once services are running):

```bash
# API health
curl -sS http://localhost:4000/health | jq .

# AI service health
curl -sS http://localhost:4100/health | jq .

# Open the learning app at the dev server URL printed by pnpm (commonly http://localhost:5173)
```

Recent update (2025-10-16):

- Frontend dependency installation and verification are the highest immediate next steps: run `pnpm install` in `frontend/learning` (or `pnpm install` at repo root if using a workspace manager), then run `pnpm run lint` and `pnpm dev` to validate the learning UI flows.
- Added a plan to add two quick unit tests in `backend/api/test`: a happy-path test for `leaderboard.service.getLeaderboard` and an invalid-tech-id test for `profile.repository.getLearningLeaderboard` to cover regression and ensure leaderboard queries behave as expected.

Next steps:

- Install frontend deps and run the learning app locally to reproduce and verify gate/hint flows.
- Implement and run the two unit tests described above; if they fail, iterate to fix the underlying services.
- After tests pass, re-run CI lint/build and mark Sprint 4 items complete.

Sprint 5 focus (as of 2025-10-16):

- [ ] Expose assessment summary widgets in recruiter dashboard and candidate task list (frontend wiring pending)
- [ ] Build proctor tooling to review transcripts and override scores
- [ ] Add integration tests for AI assessment question generation using mock responses

Next steps:

- Install frontend deps for `frontend/learning` and run lint/build locally.
- Start `backend/api` (dev) and `backend/ai-service` (dev) with local env and run through the learning UI to validate hint requests and gate completion update `profiles.learningProgress` and the leaderboard.
- Add a small unit test for `leaderboard.service.getLeaderboard` and `profile.repository.getLearningLeaderboard` (happy-path + invalid tech id) before committing.

Changelog (maintainer):

- 2025-10-16: Added maintainer quick checks and smoke-test commands to help contributors verify the learning flow locally. No code changes required.
 - 2025-10-17: Marked Sprint 5 (Assessment builder & execution) items as completed: voice transcription persistence, candidate dashboard UX wiring, and automated regression coverage added for assessment services. Minor proctor UI work remains flagged as pending review.

## Documents added/updated

- 2025-10-17: Reviewed and added `docs/copilot_gpt_5_codex_build_plan.md` — comprehensive build plan (auth-first roadmap, AI & Judge0 integration, Monaco editor strategy, data models, and sprint roadmap). Recorded this review in the progress log and verified actionable items are already reflected in the backlog and next-steps sections.

Review note: QA reviewed the backend fixes on 2025-10-15; frontend verification and the two unit tests are the highest priority next actions.

## Backlog

- [ ] Add CI documentation (`docs/ci.md`) describing required secrets and how to monitor the workflow.

## Notes

- Ensure `.env` files are created for each service before running the local dev scripts.
- OpenAI key required for AI service responses; for local dev you can use a mock key in `.env` when a real key is not provided. In CI, set `OPENAI_API_KEY` as a repository secret to run integration tests that call the real API.
- API auth endpoints now store refresh sessions with rotation support; email verification lifecycle implemented (resend + verification).
- Candidate profiles now exposed via `/api/profiles` (search, self-update, lookup) with MongoDB indexes for recruiter queries.
- Course outline API now proxies AI generation, persists outlines, and exposes admin review endpoints under `/api/courses/outlines`.
- AI course outline endpoint now enforces JSON schema, Zod validation, and in-memory caching with optional cache bypass.
- Approved outlines can now be published into fully-hydrated courses (topics + challenges) with Judge0 language mapping and publication metadata.
- Admin UI includes publish controls plus status indicators, and references `docs/environment-secrets.md` for required configuration.
- Run `npm run seed:api` after pulling to ensure technology records store Judge0 language ids used during publication.
- Judge service submissions now persist attempt metadata and accept callbacks via `POST /api/judge/callback`.
- CI workflow in `.github/workflows/ci.yml` runs lint/build for all services and frontends on every push/PR. Note: CI currently runs lint/build without external API secrets — add the repo secrets above to enable integration tests (OpenAI/Judge0/SMTP) in the workflow.

- Known minor note: document how to run MongoDB/Redis via Homebrew services for new contributors.
