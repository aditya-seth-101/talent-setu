# Talent Setu — Delivery Progress

_Last updated: 2025-10-14_

## Sprint 0 (Project setup)

- [x] Monorepo structure aligned with build plan
- [x] Backend services scaffolded (API, AI, Judge)
- [x] Docker Compose local stack verified
  - _Verified locally via `docker-compose up -d`; running services: api (4000), ai-service (4100), judge-service (4200), mongo (27017), redis (6379)._
- [x] CI pipeline skeleton
- [x] Seed data scripts

## Sprint 1 (Auth & Core Models)

- [x] Authentication with session rotation and email verification
- [x] Candidate profiles collection + search/update API endpoints
- [x] AI-generated course outlines persisted with admin review workflow stubs

## Upcoming focus

- [x] Connect Judge service callbacks into API for attempt tracking.
- [x] Boot Docker Compose stack and validate service health checks.
  - _Local validation done. Add automated CI health checks to verify on CI/staging._
- [ ] Seed GitHub Actions secrets required for external integrations (OPENAI*API_KEY, JUDGE0_API_KEY or JUDGE0_BASE_URL, SMTP*\*).
- [ ] Add CI documentation (`docs/ci.md`) describing required secrets and how to monitor the workflow.
- [ ] Build recruiter dashboard MVP wiring to API.
- [ ] Persist AI-generated outlines for admin review workflow (admin UI stubs are present; complete review/publish flow).

## Notes

- Ensure `.env` files are created for each service before running Docker Compose.
- OpenAI key required for AI service responses; local dev uses a mock key in `.env.docker` for the AI service when a real key is not provided. In CI, set `OPENAI_API_KEY` as a repository secret to run integration tests that call the real API.
- API auth endpoints now store refresh sessions with rotation support; email verification lifecycle implemented (resend + verification).
- Candidate profiles now exposed via `/api/profiles` (search, self-update, lookup) with MongoDB indexes for recruiter queries.
- Course outline API now proxies AI generation, persists outlines, and exposes admin review endpoints under `/api/courses/outlines`.
- AI course outline endpoint now enforces JSON schema, Zod validation, and in-memory caching with optional cache bypass.
- Judge service submissions now persist attempt metadata and accept callbacks via `POST /api/judge/callback`.
- CI workflow in `.github/workflows/ci.yml` runs lint/build for all services and frontends on every push/PR. Note: CI currently runs lint/build without external API secrets — add the repo secrets above to enable integration tests (OpenAI/Judge0/SMTP) in the workflow.

- Known minor note: `docker-compose.yml` includes the deprecated `version` key which triggers a non-fatal warning; consider removing it to avoid the warning in CI logs.
