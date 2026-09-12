# 200: Career Found

200: Career Found is an AI-powered career and learning assistant for people
exploring a path into IT.

The app helps users answer a practical question:

> Which IT role actually fits me, and what should I learn next?

Users share their background, experience, interests and goals. Based on that
profile, the assistant recommends three suitable IT career directions and
explains why each role could be a good fit. It highlights existing strengths,
important skill gaps and any requirements that still need to be confirmed.

After choosing a direction, users assess their current skills and receive a
personalized 30-day learning plan with practical tasks and clear next steps.
Recommendations are grounded in a prepared dataset of real job descriptions
rather than generic career advice.

## Core flow

1. User shares background: resume/experience text (typed or dictated) plus
   optional LinkedIn/GitHub profile URLs, which are scraped server-side.
2. Assistant drafts a profile (name, current role, location, background,
   goal) from that background; the user reviews and edits it.
3. User answers four assessment questions one at a time (typed or dictated).
4. Assistant infers a handful of candidate IT role titles from the profile
   and assessment, sources real job descriptions for those specific titles,
   and recommends three suitable career directions grounded in them.
5. User reviews fit explanations, strengths, gaps and open requirements, and
   chooses one direction.
6. User assesses current skills for that direction.
7. Assistant creates a personalized 30-day learning plan.

### Voice input

Every free-text field (resume text, assessment answers, skill evidence,
plan notes) has a dictation button that records a short clip in the browser
and transcribes it via ElevenLabs Speech-to-Text. Typing always remains
available; without `ELEVENLABS_API_KEY` configured, the dictation button
surfaces an inline "not configured" error instead of transcribing.

## Product goals

- Make career exploration into IT more concrete and less overwhelming.
- Connect recommendations to real job market signals.
- Help users understand both what already fits and what still needs work.
- Turn a chosen direction into an actionable short-term learning plan.

## Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript (strict mode)
- [Zod](https://zod.dev/) for runtime/type validation
- pnpm workspace (single app today; `packages/*` is reserved for future shared
  packages, e.g. shared Zod schemas/types)

## Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
pnpm build   # production build
pnpm start   # run the production build
pnpm typecheck
```

## API routes

Server-side logic lives under `app/api/*/route.ts` using Next.js Route Handlers.
Expected API work includes user profile intake, role matching, skill assessment,
learning-plan generation and access to the prepared job-description dataset.

Implemented MVP routes:

- `GET /api/workspace?workspaceId=...`
- `PUT /api/workspace`
- `POST /api/background`
- `POST /api/assessment`
- `POST /api/roles/infer`
- `POST /api/job-descriptions/source`
- `POST /api/recommendations/generate`
- `POST /api/skills/ratings`
- `POST /api/learning-plan/generate`
- `POST /api/voice/transcribe`

## Environment

The app runs locally without secrets by using deterministic fallback data and an
in-memory workspace store. Production should configure:

```bash
DATABASE_URL=postgresql://...
FIRECRAWL_API_KEY=fc-...
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.1
ELEVENLABS_API_KEY=sk_...
```

Secrets are used only inside server route handlers and server-side library
modules.

## Database

The MVP uses Neon Postgres through Drizzle with a single JSONB-backed
`workspaces` table. Apply the manual SQL migration in
`drizzle/0001_create_workspaces.sql` from the Neon SQL editor or Vercel database
query tab before relying on production persistence.

If `DATABASE_URL` is missing, or if the table is unavailable during local
development, route handlers fall back to memory for the current server process.

## Deployment

Deployed on [Vercel](https://vercel.com/), connected directly to this GitHub
repo. Every push triggers a Vercel build; no separate CI/deploy workflow is
configured here.

Copyright (c) 2026 200 OK Career Found. All rights reserved.
