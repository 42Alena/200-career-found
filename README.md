# 200: Career Found

> **Find the IT role that fits you — and know what to learn next.**

[![Next.js](https://img.shields.io/badge/Next.js-TypeScript-black)](https://nextjs.org/)
[![AI](https://img.shields.io/badge/AI-OpenAI-412991)](https://openai.com/)
[![Voice](https://img.shields.io/badge/Voice-ElevenLabs-black)](https://elevenlabs.io/)
[![Built at](https://img.shields.io/badge/Built_at-AI.WOMEN_Hackathon_2026-ff4f9a)](#team)

**200: Career Found** is an AI-powered career and learning assistant for people exploring a path into IT.

It helps answer two practical questions:

> **Which IT role actually fits me?**  
> **What should I learn next?**

The application combines a user's background, experience, interests and goals with evidence from real job descriptions. It recommends three suitable career directions, explains the reasoning, identifies important skill gaps and turns the selected direction into a personalized 30-day learning plan.

**Built during the AI.WOMEN Hackathon 2026 in Hamburg by team 200 OK.**

<!-- Add your deployed URL here -->
**Live demo:** `YOUR-DEMO-URL`

---

## The problem

Moving into IT can be confusing.

There are many possible roles, overlapping requirements and endless learning resources. A person may know they want to work in tech but still not know:

**Which role fits my experience? What skills do I already have? What am I missing? And what should I do next?**

**200: Career Found turns that uncertainty into a concrete path forward.**

---

## How it works

```text
Your background
      ↓
AI-built profile
      ↓
Short assessment
      ↓
Relevant IT roles
      ↓
Real job-market evidence
      ↓
3 personalized recommendations
      ↓
Choose a direction
      ↓
Skill-gap analysis
      ↓
30-day learning plan
```

Users start by sharing their experience, skills, projects and goals. They can type their answers or use voice input.

The assistant creates a structured profile, asks a short assessment and identifies relevant IT career directions.

For each recommendation, the user can see:

- why the role may fit
- which existing strengths are relevant
- which skills are still missing
- which requirements need more information

After selecting a direction, the user assesses their current skills and receives a personalized **30-day learning plan** with practical tasks and clear next steps.

---

## What makes it different

Many career tools stop at:

> *"Here are some jobs you might like."*

**200: Career Found connects career discovery with action.**

```text
experience → market evidence → career direction → skill gaps → learning plan
```

Recommendations are grounded in real job descriptions rather than generic career advice alone.

The goal is not to tell someone that they are automatically qualified for a role.

The goal is to help them understand:

> **Where could I realistically go next, and what would I need to learn to get there?**

---

## How AI is used

AI does the core reasoning inside the product.

### Understand the user

The assistant turns free-form information into a structured profile of experience, skills, projects, interests and goals.

It distinguishes between information supported by the user's examples and information that still needs confirmation.

### Find relevant career directions

The profile and assessment are used to identify IT roles worth exploring.

### Ground recommendations in the job market

Real job descriptions provide evidence about skills and requirements for those roles.

The assistant combines this evidence with the user's profile to generate three explained recommendations.

### Identify skill gaps

For the selected role, the system compares relevant job requirements with the user's current skills and experience.

### Build the next step

The gaps are transformed into a personalized 30-day learning plan with practical exercises and expected outcomes.

### Voice input

Users can dictate free-text answers instead of typing them. Speech is transcribed using **ElevenLabs Speech-to-Text**.

---

## Built for transparency

The application does not simply return a career title.

It is designed to show **why** a direction was recommended and connect that recommendation to evidence from the job market.

AI handles interpretation, matching, analysis and personalization. The application handles the user journey, validation, state, interfaces and orchestration around those AI workflows.

---

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend & backend | Next.js + React |
| Language | TypeScript |
| Validation | Zod |
| AI reasoning | OpenAI |
| Voice input | ElevenLabs |
| Package management | pnpm |
| Deployment | Vercel |

---

## Run locally

```bash
git clone https://github.com/42Alena/200-career-found.git
cd 200-career-found

pnpm install

cp .env.example .env.local

pnpm dev
```

Then open:

```text
http://localhost:3000
```

The required environment variables are documented in `.env.example`.

Keep API keys in `.env.local` and never commit them to the repository.

---

## Development

```bash
pnpm dev        # start the development server
pnpm build      # create a production build
pnpm start      # run the production build
pnpm typecheck  # run TypeScript checks
```

---

## Project status

**200: Career Found is a hackathon MVP.**

The focus is one complete end-to-end experience:

**understand the user → find realistic directions → identify gaps → create an actionable learning plan.**

The project can later expand to additional career directions, larger job datasets and more adaptive learning journeys.

---

## Team

### 200 OK

**Alena Kurmyza**  
**Olena Hladkovska**  
**Huayun Ai**

Built during the **AI.WOMEN Hackathon 2026** in Hamburg.

---

## Why "200: Career Found"?

In HTTP:

```text
200 OK
```

means that a request succeeded.

We turned:

```text
404: Career Not Found
```

into:

```text
200: Career Found
```

Because finding the right direction should feel like finally getting a successful response.

---

## About the hackathon

This project was created during the **AI.WOMEN Hackathon 2026**.

The public repository and commit history document the development of the prototype during the hackathon weekend.

---

## Copyright

Copyright © 2026 **200: Career Found**.  
All rights reserved.
