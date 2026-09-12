# Master Breakdown Plan — 200: Career Found MVP

## Summary
- Build a no-login MVP flow: profile -> quick assessment -> suggested roles -> skills assessment -> 30-day learning plan.
- Use Next.js App Router on Vercel, TypeScript/Zod contracts, server-side AI APIs, Firecrawl for job-description sourcing, and Postgres for persistence.
- Use this as the parent roadmap. Future detailed plans should reference epic IDs `E0`-`E7`.

## Epics And Ownership
- `E0 Foundation & Contracts` — Both: shared schemas/types, API contracts, fixtures, env validation, database plan, test setup.
- `E1 User Workspace & Profile` — Frontend lead: anonymous session, profile form, saved progress.
- `E2 Quick Assessment` — Frontend lead: PDF/paste CV input, LinkedIn/GitHub text, four questions, validation states.
- `E3 Job Description Sourcing` — Backend lead: Firecrawl server adapter to collect five valid job descriptions per role.
- `E4 Recommendations & Skill Extraction` — Backend lead: AI pipeline for three roles, strengths, gaps, confirmations, essential/preferred skills.
- `E5 Skills Assessment` — Frontend lead: skill list, ratings, experience notes, saved progress.
- `E6 Learning Plan` — Shared: generate and display 30-day plan with tasks, time estimates, outputs, checkboxes, and notes.
- `E7 QA, Deploy & Handoff` — Both: Vercel preview validation, fallback states, docs, review.

## Public Interfaces To Stabilize
- Core entities: `Profile`, `AssessmentInput`, `AssessmentSnapshot`, `JobDescriptionSource`, `RoleRecommendation`, `SkillRequirement`, `SkillRating`, `LearningPlan`, `LearningPlanDay`.
- API capabilities: save/load workspace, submit assessment, source job descriptions, generate recommendations, submit skill ratings, generate/update learning plan.
- Output rules: exactly three recommendations; up to five Firecrawl-sourced job descriptions per role; skills split into `essential` and `preferred`; learning plan has 30 day items.
- Secrets stay server-only: `DATABASE_URL`, `FIRECRAWL_API_KEY`, and AI provider key.

## Development Order
1. `E0`: contracts, env, fixtures, database direction, tests.
2. `E1` plus mocked `E2/E4/E6`: complete clickable flow with fake data.
3. `E2`: real assessment intake and persistence.
4. `E3`: Firecrawl job-description sourcing and storage.
5. `E4`: AI recommendations and skill extraction.
6. `E5`: connected skill-rating workflow.
7. `E6`: generated learning plan plus checklist/notes persistence.
8. `E7`: acceptance pass, Vercel preview, docs, and review.

## Child Plans To Create Next
- `P0`: Foundation, contracts, database, env, testing.
- `P1`: Product shell, navigation, screen states, visual system.
- `P2`: Profile and quick assessment intake.
- `P3`: Firecrawl job-description sourcing pipeline.
- `P4`: AI recommendation and skill extraction pipeline.
- `P5`: Skills assessment interaction and persistence.
- `P6`: 30-day learning-plan generation and progress tracking.
- `P7`: QA, preview deployment, observability, handoff checklist.

## Test Plan
- Unit tests for schemas, input normalization, skill deduplication, and plan helpers.
- Mocked API tests for Firecrawl, AI success/failure, malformed output, and fewer-than-five job descriptions.
- UI tests for empty, loading, error, completed, and reload states.
- Smoke test: profile -> assessment -> recommendations -> skill ratings -> learning plan updates.

## Assumptions
- V1 has no login; saved progress uses an anonymous browser/session id.
- Default database is Neon Postgres + Drizzle unless `P0` replaces it.
- CV originals are not stored in v1; extracted text and generated outputs may be stored.
- Firecrawl is called only from the server. Current docs describe `/v2/search` for search with optional scraping and `/v2/scrape` for single-URL markdown/JSON extraction.
- Sources: [Firecrawl Search](https://docs.firecrawl.dev/api-reference/endpoint/search), [Firecrawl Scrape](https://docs.firecrawl.dev/api-reference/endpoint/scrape), [Firecrawl API v2 Introduction](https://docs.firecrawl.dev/api-reference/v2-introduction).
