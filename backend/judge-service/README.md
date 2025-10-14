# Talent Setu Judge Service

Adapter service for interacting with Judge0 to compile and grade code submissions. It encapsulates submission creation and polling so that other services can use a stable API.

## Scripts

- `npm run dev` – start the service with watch mode.
- `npm run build` – type-check and emit to `dist/`.
- `npm start` – run the compiled service.
- `npm run lint` – lint the TypeScript source.

## Endpoints

- `POST /judge/submissions` – forward a submission payload to Judge0.
- `GET /judge/submissions/:token` – poll Judge0 for the submission result.

## Environment

Copy `.env.example` to `.env` and configure the Judge0 base URL and API key (if using RapidAPI deployment).
