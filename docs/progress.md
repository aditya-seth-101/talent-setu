# Talent Setu — Delivery Progress

_Last updated: 2025-10-14_

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

## Upcoming focus

- [x] Connect Judge service callbacks into API for attempt tracking.
- [ ] Seed GitHub Actions secrets required for external integrations (OPENAI*API_KEY, JUDGE0_API_KEY or JUDGE0_BASE_URL, SMTP*\*).
- [ ] Add CI documentation (`docs/ci.md`) describing required secrets and how to monitor the workflow.
- [ ] Build recruiter dashboard MVP wiring to API.
- [ ] Persist AI-generated outlines for admin review workflow (admin UI stubs are present; complete review/publish flow).

## Notes

- Ensure `.env` files are created for each service before running the local dev scripts.
- OpenAI key required for AI service responses; for local dev you can use a mock key in `.env` when a real key is not provided. In CI, set `OPENAI_API_KEY` as a repository secret to run integration tests that call the real API.
- API auth endpoints now store refresh sessions with rotation support; email verification lifecycle implemented (resend + verification).
- Candidate profiles now exposed via `/api/profiles` (search, self-update, lookup) with MongoDB indexes for recruiter queries.
- Course outline API now proxies AI generation, persists outlines, and exposes admin review endpoints under `/api/courses/outlines`.
- AI course outline endpoint now enforces JSON schema, Zod validation, and in-memory caching with optional cache bypass.
- Judge service submissions now persist attempt metadata and accept callbacks via `POST /api/judge/callback`.
- CI workflow in `.github/workflows/ci.yml` runs lint/build for all services and frontends on every push/PR. Note: CI currently runs lint/build without external API secrets — add the repo secrets above to enable integration tests (OpenAI/Judge0/SMTP) in the workflow.

- Known minor note: document how to run MongoDB/Redis via Homebrew services for new contributors.
