# STARS

Editorial-style film review frontend built with React, TypeScript, and Vite.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local env file from the example:

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

3. Edit `.env.local` and add your TMDB credential:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key_here
# or
VITE_TMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token_here
```

4. Start or restart the app:

```bash
npm run dev
```

If you leave the TMDB values empty, the app still starts, but TMDB-backed features will be unavailable.

## TMDB

- Put your API key in `.env.local` at `VITE_TMDB_API_KEY`.
- If you prefer the bearer token, use `VITE_TMDB_READ_ACCESS_TOKEN`.
- TMDB requests should go through `src/lib/tmdb.ts`.
- Environment settings live in `src/lib/env.ts`.

## Production

- Default router mode is `hash`, which is safer on static hosts without SPA rewrites.
- If your host supports rewrites, set `VITE_ROUTER_MODE=browser`.
- If deploying under a subpath, set `VITE_BASE_PATH` to that path, for example `/stars/`.

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
```
