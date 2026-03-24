# Restify

Restify is a browser-based REST API client built as a multi-package repo with:

- `frontend/`: React + TypeScript + Vite + Tailwind
- `backend/`: Fastify + MongoDB + JWT cookie auth
- `shared/`: shared TypeScript contracts used by both apps

## Local development

1. Install dependencies with `npm install`
2. Copy `.env.example` to `backend/.env` or the repo root `.env` if you want to override defaults
3. Start MongoDB with `npm run db:up`
4. Run `npm run dev`
5. Open the local Vite URL shown in the terminal, usually `http://127.0.0.1:3030`

The backend defaults to `mongodb://localhost:27017/restify`, and `compose.yaml` starts a local MongoDB on that port so the app can boot without extra setup.

The frontend dev server uses `127.0.0.1` and starts at port `3030` because some Windows setups reserve port `5173`, which causes Vite to fail with `EACCES`. If `3030` is busy, Vite will automatically move to the next available local port.

The root install bootstraps `shared/`, `backend/`, and `frontend/` automatically, so it works even on npm versions that do not support the `workspace:*` protocol.

## Production build

- `npm run build`
- `npm --prefix backend run start`

## Local database helpers

- `npm run db:up`
- `npm run db:down`
- `npm run db:logs`
