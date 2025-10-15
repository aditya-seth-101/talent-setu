# Environment & Secrets Reference

This reference consolidates all required environment variables across the Talent Setu services so you can configure local development and CI/CD pipelines consistently.

## Quick summary

| Service                                 | Env file              | Required secrets                                                                                                                                                                                | Notes                                                                 |
| --------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| API (`backend/api`)                     | `.env`                | `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JUDGE_SERVICE_URL`, `JUDGE_CALLBACK_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `EMAIL_FROM`                | Tokens must be 32+ chars; callback secret must match Judge adapter.   |
| AI service (`backend/ai-service`)       | `.env`                | `OPENAI_API_KEY`, `OPENAI_MODEL`                                                                                                                                                                | `OPENAI_MODEL` defaults to `gpt-4.1-mini`; override if needed.        |
| Judge service (`backend/judge-service`) | `.env`                | `JUDGE0_BASE_URL`, `JUDGE0_API_KEY`, `CALLBACK_BASE_URL`                                                                                                                                        | `CALLBACK_BASE_URL` must point at API `POST /api/judge/callback`.     |
| Frontend apps                           | `.env` / `.env.local` | `VITE_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`                                                                                                                                               | Points browsers at the API gateway (default `http://localhost:4000`). |
| GitHub Actions                          | Repository secrets    | `OPENAI_API_KEY`, `JUDGE0_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JUDGE_CALLBACK_SECRET`, `EMAIL_FROM` | Set via repo settings so CI mirrors production constraints.           |

## Backend API (`backend/api`)

Copy `.env.example` to `.env` and adjust:

- `MONGODB_URI`: Connection string to your MongoDB instance.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: Random 32+ character strings. Access TTL and refresh TTL settings should match token lifetimes.
- `JUDGE_SERVICE_URL`: Base URL for the internal Judge adapter (defaults to `http://localhost:4200`).
- `JUDGE_CALLBACK_SECRET`: Shared secret that the Judge adapter forwards on callbacks; prevents spoofed submissions.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `EMAIL_FROM`: SMTP credentials used for verification/notification emails. For local dev you can use tools like MailHog (`localhost:1025`) with empty username/password.

## AI service (`backend/ai-service`)

Copy `.env.example` to `.env` and provide:

- `OPENAI_API_KEY`: Required for live prompt orchestration. Use a mock value during development if you hit the mock route, but CI needs a real key to exercise end-to-end generation.
- `OPENAI_MODEL`: Optional override for the deployed model (default `gpt-4.1-mini`).
- `PROMPT_CACHE_TTL_SECONDS`: Controls cache duration for AI responses (defaults to 3600s).

## Judge adapter (`backend/judge-service`)

Copy `.env.example` to `.env`:

- `JUDGE0_BASE_URL`: REST endpoint for Judge0 (RapidAPI or self-hosted CE instance).
- `JUDGE0_API_KEY`: Required when using RapidAPI; leave blank for self-hosted Judge0.
- `CALLBACK_BASE_URL`: API callback URL, typically `http://localhost:4000/api/judge/callback?secret=${JUDGE_CALLBACK_SECRET}`.

## Frontend apps

Each frontend respects a public API base URL:

- Vite apps (`frontend/admin`, `frontend/assessment`): set `VITE_API_BASE_URL` in `.env.local`.
- Next.js apps (`frontend/learning`, `frontend/recruitment`): set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`.

Without these overrides the apps default to `http://localhost:4000`.

## GitHub Actions secret checklist

Set these repo secrets so CI can run integration steps:

- `OPENAI_API_KEY`
- `JUDGE0_API_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `EMAIL_FROM`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `JUDGE_CALLBACK_SECRET`

For GitHub CLI you can seed them quickly:

```bash
gh secret set OPENAI_API_KEY --body "sk-live-..."
gh secret set JUDGE0_API_KEY --body "..."
# repeat for remaining secrets
```

Ensure values match the `.env` files you commit locally so parity between dev and CI is maintained.
