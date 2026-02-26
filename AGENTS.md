# AGENTS.md

## Project Overview

Bubble is a prototype web application.
Sprint 1 is intentionally simplified to reduce architectural complexity.

---

## Core Architecture (Sprint 1 – Fixed Constraints)

### Single Thread System

- All features operate under a single thread.
- Thread ID is always: `1`
- All endpoints use `/api/threads/1/...`
- No dynamic thread creation or multi-thread support in Sprint 1.

This constraint must not be changed during Sprint 1.

---

## Backend Stack (Fixed)

- Node.js
- TypeScript
- Fastify
- Prisma ORM
- PostgreSQL

All database access must go through Prisma.
All HTTP routes must use Fastify.

---

## Frontend Stack (Fixed)

- React
- TypeScript
- Vite

No framework migrations.
No replacement of Vite or React.

---

## Authentication Model (Sprint 1)

- A JWT-based auth system exists.
- Messaging, polls, and recap endpoints DO NOT require authentication.
- Username for messaging and polls is stored in `localStorage`.
- Features must continue working without login.

Authentication must not block other features in Sprint 1.

---

## Database Models (Core Entities)

The following entities must exist:

- User
- Thread
- Message
- Poll
- PollOption
- Vote

All messages and polls reference `threadId = 1`.

Schema structure defined by Admin must not be modified mid-sprint.

---

## Context / Recap System (Sprint 1)

- Recap and Relevant features are read-only.
- They consume existing Messages and Polls.
- No additional database schema changes are allowed for recap.

---

## General Rules

- No real-time requirements (refresh-based updates are acceptable).
- No background job systems.
- No vector databases.
- No embeddings.
- No additional infrastructure beyond the defined stack.

Sprint 1 prioritizes simplicity and working functionality over scalability or production readiness.
