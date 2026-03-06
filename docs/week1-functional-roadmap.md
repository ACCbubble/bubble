# Bubble Week 1 Functional Roadmap (Beginner-Friendly)

This guide translates the Sprint 1 constraints into a practical build order so the app becomes functional quickly.

## 1) What exists right now

The current repository is a **frontend-only Vite + React + TypeScript app** with page placeholders for:

- Sign in
- Sign up
- Temp username
- Messages
- Polls

The app shell and routing are already wired.

## 2) What “functional” means for Week 1

By end of Week 1, a user should be able to:

1. Open the app.
2. Set a temporary username (stored in `localStorage`).
3. View messages for thread `1`.
4. Post a message to thread `1`.
5. View polls for thread `1`.
6. Create a poll and vote.
7. Use sign-up/sign-in (JWT), but messaging and polls still work without auth.

## 3) Required architecture constraints (do not change)

- Single thread only (`threadId = 1`).
- Fastify backend endpoints.
- Prisma for all database access.
- PostgreSQL database.
- React + Vite frontend.
- Recap/relevant endpoints are read-only and based on existing messages/polls.

## 4) Build order (the most important part)

Implement in this exact order:

### Step A — Backend scaffold first

Create a backend folder (for example `server/`) and initialize:

- `server/package.json`
- `server/tsconfig.json`
- `server/src/index.ts` (Fastify server bootstrap)
- `server/src/plugins/prisma.ts` (single Prisma client instance)
- `server/.env` (`DATABASE_URL`, `JWT_SECRET`)

Why first: frontend pages already call APIs, so backend contracts unblock everything.

### Step B — Prisma schema + migration

In backend:

- `server/prisma/schema.prisma`
- `server/prisma/migrations/...`
- `server/prisma/seed.ts`

Models to include:

- `User`
- `Thread`
- `Message`
- `Poll`
- `PollOption`
- `Vote`

Seed thread `1` so APIs always have a valid thread.

### Step C — Messages API (first real feature)

Add routes:

- `GET /api/threads/1/messages`
- `POST /api/threads/1/messages`

Files:

- `server/src/routes/messages.ts`
- `server/src/schemas/messages.ts` (zod or JSON schema for request/response)

Rules:

- No auth required.
- Username comes from request body and should be validated.
- Always persist with `threadId = 1`.

### Step D — Polls API

Add routes:

- `GET /api/threads/1/polls`
- `POST /api/threads/1/polls`
- `POST /api/threads/1/polls/:pollId/votes`

Files:

- `server/src/routes/polls.ts`
- `server/src/schemas/polls.ts`

Rules:

- No auth required.
- Username from request.
- Poll options + votes tied to thread `1` polls.

### Step E — Auth API (non-blocking)

Add routes:

- `POST /api/auth/sign-up`
- `POST /api/auth/sign-in`
- Optional: `GET /api/auth/me`

Files:

- `server/src/routes/auth.ts`
- `server/src/lib/jwt.ts`
- `server/src/lib/password.ts`

Rules:

- JWT for auth endpoints.
- Do not require auth for messages/polls.

### Step F — Frontend messages page

Implement in `src/pages/MessagesPage.tsx`:

- Load messages with `apiGet('/api/threads/1/messages')`.
- Render list state (loading/error/empty/data).
- Submit form with `apiPost('/api/threads/1/messages', payload)`.
- Pull username from `getUsername()`.

Keep all HTTP logic through `src/api.ts` helper.

### Step G — Frontend polls page

Implement in `src/pages/PollsPage.tsx`:

- Fetch polls list.
- Create poll form.
- Vote buttons.
- Loading/error/empty states.
- Use temp username from `localStorage` helper.

### Step H — Frontend sign-up/sign-in pages

Implement:

- `src/pages/SignUpPage.tsx` -> POST to `/api/auth/sign-up`
- `src/pages/SignInPage.tsx` -> POST to `/api/auth/sign-in`

Sprint 1 note: these pages can succeed/fail independently, but they must not gate messages/polls.

### Step I — Recap/read-only endpoints

Add read-only endpoints (backend) after messages/polls are stable.

Example files:

- `server/src/routes/recap.ts`
- `server/src/services/recap.ts`

No schema changes required.

## 5) Frontend file map (what each file does)

- `src/main.tsx` — app entry point.
- `src/App.tsx` — route table and navigation.
- `src/api.ts` — shared GET/POST wrappers.
- `src/lib/username.ts` — temporary username localStorage logic.
- `src/pages/TempUsernameAssignment.tsx` — UI to save username.
- `src/pages/MessagesPage.tsx` — should become message list + create form.
- `src/pages/PollsPage.tsx` — should become poll list + create/vote UI.
- `src/pages/SignUpPage.tsx` — sign-up form.
- `src/pages/SignInPage.tsx` — sign-in form.

## 6) Data flow (how pieces relate)

1. User types in UI form (React state).
2. Page calls `apiPost` or `apiGet` from `src/api.ts`.
3. Request hits Fastify route.
4. Route validates input and calls Prisma.
5. Prisma reads/writes PostgreSQL.
6. Fastify returns JSON.
7. React updates page state and re-renders.

## 7) Minimal backend structure to create

```text
server/
  src/
    index.ts
    plugins/
      prisma.ts
    routes/
      auth.ts
      messages.ts
      polls.ts
      recap.ts
    schemas/
      auth.ts
      messages.ts
      polls.ts
    lib/
      jwt.ts
      password.ts
    services/
      recap.ts
  prisma/
    schema.prisma
    seed.ts
```

## 8) Testing order

1. Backend unit/integration sanity checks for each route.
2. Manual API checks in order: messages -> polls -> auth.
3. Frontend page checks with backend running.
4. End-to-end happy path:
   - set temp username
   - post message
   - create poll
   - vote
   - refresh and confirm persistence

## 9) First 10 concrete tasks to assign

1. Create backend project folder + Fastify bootstrap.
2. Add Prisma schema with required models.
3. Run migration + seed thread `1`.
4. Implement GET messages.
5. Implement POST message.
6. Implement GET polls.
7. Implement POST poll.
8. Implement POST vote.
9. Hook MessagesPage to APIs.
10. Hook PollsPage to APIs.

Then add sign-up/sign-in and recap once core messaging/polls are stable.

## 10) Definition of done for Week 1

- Messages and polls usable without login.
- All data tied to thread `1`.
- Backend uses Fastify + Prisma only.
- Frontend pages no longer placeholders.
- Basic auth endpoints functional but optional for core flow.
- No architecture violations from Sprint 1 constraints.
