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

1. User shares background, experience, interests and goals.
2. Assistant recommends three suitable IT career directions.
3. User reviews fit explanations, strengths, gaps and open requirements.
4. User chooses one direction.
5. User assesses current skills for that direction.
6. Assistant creates a personalized 30-day learning plan.

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
```

## API routes

Server-side logic lives under `app/api/*/route.ts` using Next.js Route Handlers.
Expected API work includes user profile intake, role matching, skill assessment,
learning-plan generation and access to the prepared job-description dataset.

## Deployment

Deployed on [Vercel](https://vercel.com/), connected directly to this GitHub
repo. Every push triggers a Vercel build; no separate CI/deploy workflow is
configured here.
