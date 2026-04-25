# PreventHub Frontend

Next.js frontend for PreventHub with two portal baselines:
- `/admin`
- `/citizen`

## Local Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Environment

Set `NEXT_PUBLIC_API_BASE_URL` to the gateway address.

Default fallback used in code:
- `http://localhost:8000`

## API Client

Shared API client lives in:
- `src/lib/api/client.ts`

Contract types live in:
- `src/lib/api/types.ts`

## Docker

A multi-stage Dockerfile is included at:
- `frontend/Dockerfile`

It builds and runs the production Next.js app on port `3000`.
