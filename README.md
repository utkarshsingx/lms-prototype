# Meridian

A design prototype for a full learning platform, from the login screen through
authoring, delivery, assessment and the channels that chase a learner when they
stall. Every screen is populated with real-shaped data; nothing calls a backend.

```bash
npm install
npm run dev      # http://localhost:3000
```

Start at `/` for the marketing page, or go straight to `/dashboard`.

## What is here

**Learner**

| Route | What it shows |
|---|---|
| `/login` `/signup` `/reset` | Sign-in, a three-step sign-up that ends on a recommended path, password reset |
| `/dashboard` | Continue-learning hero, deadlines, path position, activity heat map |
| `/catalog` `/courses/[slug]` | Filterable catalog; course page with curriculum, outcomes, instructor, reviews |
| `/learn/[slug]` | The player. Renders every content type (below) with a curriculum rail, transcript, notes, Q&A, resources and a lesson-scoped tutor |
| `/paths` `/paths/[slug]` | Sequenced tracks with required/optional steps and evidence gates |
| `/assessments` `/assessments/[id]` | Honour-code intro with the rubric visible, timed runner with a question navigator and flagging, per-question results |
| `/assistant` | Full-page chat, its tool list, and its boundary |
| `/profile` | Certificates, badges, record |

**Admin and instructor** — switch role in the sidebar, or open any manage route directly

| Route | What it shows |
|---|---|
| `/manage` | Org overview: engagement, completion by department, compliance funnel, channel performance, content health |
| `/studio` `/studio/[slug]` | Course list and the builder: editable module/lesson tree, delivery settings, learners, version history, publish checklist |
| `/grading` | Grading queue with rubric marking, running score and feedback |
| `/people` | Directory, at-risk segments, compliance by department |
| `/channels/whatsapp` | Inbox, threads, approved templates, the rules the channel runs under |
| `/channels/voice` | Campaigns, call log with transcripts and the state each call changed, agent guardrails |
| `/settings` | Workspace, notifications, integrations, privacy and retention |

## Content types

The player has a distinct viewer for each: video with chapters, captions and a
transcript; readings; PDF with a page rail; slide decks; **SCORM 2004 and xAPI**
packages with their runtime data (`cmi.completion_status`, `suspend_data`, xAPI
statements) shown on screen; inline quizzes; labs with a test runner; assignment
upload against a visible rubric; and live sessions.

## Assessment

Six question types — single choice, multi-select, true/false, short answer, code
and essay. Multiple choice and true/false grade on submit. Written answers are
held for review. Essays and projects are marked by a person against a rubric the
learner can read *before* starting, in `/grading`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
lucide-react · framer-motion. Charts are hand-rolled SVG rather than a charting
dependency. All 24 routes prerender static.

## Design

Tokens live in [`app/globals.css`](app/globals.css) — a warm paper ground, near-black
ink and one electric accent, defined once in light and overridden for dark, then
exposed to Tailwind through `@theme inline`. Type pairs Instrument Serif for
display with Inter for UI. Light and dark are both first-class; the theme is
applied before paint so it never flashes.

Data is in [`lib/data/`](lib/data). Curricula are authored as titles only and
expanded by [`lib/data/curriculum.ts`](lib/data/curriculum.ts), which derives
lesson type, length and completion state — so every course in the catalog has a
consistent full tree.

## Prototype boundaries

No backend, no auth, no persistence beyond `localStorage` for theme and role.
Any credentials sign you in. The assistant is scripted from a keyword table in
[`lib/assistant.ts`](lib/assistant.ts), grounded in the same mock data the rest
of the app reads.
