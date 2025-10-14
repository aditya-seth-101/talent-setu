# Talent Setu — Delivery Progress

_Last updated: 2025-10-14_

## Sprint 0 (Project setup)

- [x] Monorepo structure aligned with build plan
- [x] Backend services scaffolded (API, AI, Judge)
- [ ] Docker Compose local stack verified
- [ ] CI pipeline skeleton
- [x] Seed data scripts

## Upcoming focus

- [x] Connect Judge service callbacks into API for attempt tracking.
- [ ] Boot Docker Compose stack and validate service health checks.
  - _Blocked_: Docker daemon not running in current environment; stack configuration prepared with `.env.docker` presets.
- [ ] Build recruiter dashboard MVP wiring to API.
- [ ] Persist AI-generated outlines for admin review workflow.

## Notes

- Ensure `.env` files are created for each service before running Docker Compose.
- OpenAI key required for AI service responses; use mock adapter for local development when key is unavailable.
- API auth endpoints now store refresh sessions with rotation support; email verification lifecycle implemented (resend + verification).
- AI course outline endpoint now enforces JSON schema, Zod validation, and in-memory caching with optional cache bypass.
- Judge service submissions now persist attempt metadata and accept callbacks via `POST /api/judge/callback`.
