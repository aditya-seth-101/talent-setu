# Talent Setu AI Service

This service coordinates AI interactions for generating course content, hints, and assessment variations.

## Scripts

- `npm run dev` – run the service with live reload.
- `npm run build` – emit compiled JavaScript to `dist/`.
- `npm start` – run the compiled service.
- `npm run lint` – lint the TypeScript source files.

## Environment

Copy `.env.example` to `.env` and supply a valid `OPENAI_API_KEY`.

Available variables:

- `OPENAI_MODEL` (optional) – override the default model (`gpt-4.1-mini`).
- `PROMPT_CACHE_TTL_SECONDS` – set to `0` to disable caching.

## API surface

- `POST /ai/prompts/course-outline` – generate a course outline JSON document for a given technology/level. Accepts `{ technology, level, seed?, forceRefresh? }`.

## Notes

- Uses OpenAI's Responses API with JSON Schema enforcement and Zod validation before returning data.
- Results are cached in-memory using the composite request signature for `PROMPT_CACHE_TTL_SECONDS`.
- Include a `forceRefresh: true` flag in the request body to bypass the cache.
