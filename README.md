# STARS

Editorial-style film review frontend built with React and Vite.

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
- TMDB requests should go through `src/lib/tmdb.js`.
- Environment settings live in `src/lib/env.js`.

**NOTE:** If you choose to use either the TMDB key or token by itself, remove the other entry entirely

## Production

- Default router mode is `browser`, which matches the included `vercel.json` SPA rewrite setup.
- Use `VITE_ROUTER_MODE=hash` only if you deploy to a host without SPA rewrites.
- If deploying under a subpath, set `VITE_BASE_PATH` to that path, for example `/stars/`.

## Vercel

1. Import the repo into Vercel.
2. Leave the framework preset on `Vite`.
3. Add the environment variables from `.env.example` in the Vercel project settings.
4. Keep `VITE_ROUTER_MODE=browser` for Vercel.
5. Deploy after confirming your Firebase project config and TMDB credential are set.

The included `vercel.json` already adds SPA rewrites and a small set of security headers.

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
```
