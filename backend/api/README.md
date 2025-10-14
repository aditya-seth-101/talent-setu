# Talent Setu API Service

This service exposes the HTTP API gateway for the Talent Setu platform. It is responsible for authentication, user management, courses, assessments, and admin endpoints.

## Available scripts

- `npm run dev` – start the server in watch mode (uses `tsx`).
- `npm run build` – type check and emit compiled JavaScript to `dist/`.
- `npm start` – run the compiled server from `dist/`.
- `npm run lint` – lint the TypeScript source.

## Tech stack

- Express 4 (ESM)
- TypeScript with strict settings
- MongoDB driver
- Pino structured logging
- Zod for input validation

## Getting started locally

1. Copy `.env.example` to `.env` and update secrets.
2. Ensure MongoDB is running locally (for example via Homebrew `brew services start mongodb/brew/mongodb-community` or a managed cloud instance).
3. From the repo root run:

```bash
npm install
npm run dev:api
```

The API will listen on `http://localhost:4000`.

## Auth endpoints (currently available)

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `GET /api/auth/me`

Refresh tokens are stored as hashed sessions in MongoDB and rotated on each refresh request.

Email verification tokens are single-use and expire after `EMAIL_VERIFICATION_TTL_HOURS`. Without SMTP settings the service falls back to logging the email payload (JSON transport) for local development.

## Judge endpoints

- `POST /api/judge/submissions` — submit a code attempt (requires auth)
- `GET /api/judge/submissions/:attemptId` — retrieve attempt status (requires auth)

Judge0 callbacks should be directed to `POST /api/judge/callback` and secured with `JUDGE_CALLBACK_SECRET`. The service forwards responses into the `judge_attempts` collection for progress tracking.
