# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Type-check with tsc then bundle with Vite
npm run lint     # Run ESLint across all source files
npm run preview  # Serve the production build locally
```

There are no tests configured yet.

## Architecture

**Stack:** React 19 · TypeScript · Vite · React Router DOM 7 · TanStack React Query 5

**Entry point:** `src/main.tsx` — mounts `<App />`.

**Routing:** `src/App.tsx` — `BrowserRouter` with five routes:
- `/` → redirects to `/sign-in`
- `/sign-in` → `SignInPage`
- `/sign-up` → `SignUpPage`
- `/temp-username` → `TempUsernameAssignmentPage`
- `/messages` → `MessagesPage`
- `/polls` → `PollsPage`

**API layer:** `src/api.ts` — `apiGet<T>(path)` and `apiPost<T>(path, body)` helpers using `fetch` with `credentials: 'include'` against `VITE_API_BASE_URL`.

**Username:** `src/lib/username.ts` — `getUsername()` / `setUsername()` backed by `localStorage` key `bubble_username`. All messaging and poll features use this instead of auth.

**Pages:** `src/pages/` — one file per route. Add new pages here and register them in `src/App.tsx`.

**All API calls target thread ID `1`** — single-thread constraint for Sprint 1. See `AGENTS.md` for full Sprint 1 rules.

## Environment

`.env.development` is already present:
```
VITE_API_BASE_URL=http://localhost:3000
```
No additional setup needed for local development.
