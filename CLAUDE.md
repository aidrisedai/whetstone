# Whetstone — Developer Guide

Whetstone is a Next.js 16 + TypeScript application that helps teen builders sharpen project ideas through an AI advisor, then teaches them to build those ideas step by step.

## Getting started

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Without `ANTHROPIC_API_KEY`, the app runs in **demo mode** automatically — all flows work with deterministic stand-ins from `lib/demo.ts`.

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm test` | Vitest unit tests |

## Architecture

```
app/
  page.tsx           → entry; reads env vars, renders <WhetstoneApp>
  api/               → 15 Next.js route handlers (see below)

components/
  WhetstoneApp.tsx   → top-level orchestrator; owns all phase state
  BuildWorkspace.tsx → build phase UI (code editor, coach, quiz)
  Whiteboard.tsx     → hand-drawn teaching board
  CodeLesson.tsx     → beat-by-beat code walkthrough
  ScorePanel.tsx     → live scoring dimensions sidebar

lib/
  anthropic.ts       → SDK client, model constants, demo-mode flag
  types.ts           → all shared TypeScript types
  prompts.ts         → system prompts + user message builders
  scoring.ts         → score clamping, finalizeAssessment, isReady
  demo.ts            → deterministic stand-in responses
  serverUtils.ts     → safeParseJson, jsonError, getErrorMessage
  clientApi.ts       → typed client-side fetch helpers

hooks/
  useSpeechRecognition.ts
  useSpeechSynthesis.ts
  useTeacherVoice.ts

tests/               → Vitest unit tests (scoring, serverUtils)
```

## Two-phase flow

1. **Sharpen** — User describes an idea; the advisor (Sonnet 4.6) replies live via streaming. The scorer (Opus 4.8) grades in parallel across clarity, conciseness, and 2-3 dynamic dimensions. When all scores clear the threshold (default 80, floor 65) the app auto-exports the refined prompt.

2. **Build (Coach Spark)** — Planner breaks the project into 3-5 parts. For each part: whiteboard teaching → checkpoint quiz → code lesson → streamed code generation. An XP system rewards progress.

## API routes

| Route | Model | Purpose |
|-------|-------|---------|
| `/api/advisor` | Sonnet 4.6 | Streamed advisor chat |
| `/api/score` | Opus 4.8 | Structured assessment |
| `/api/lesson` | Opus 4.8 | Closing lesson |
| `/api/export` | — | Builder hand-off |
| `/api/plan` | Opus 4.8 | Build plan |
| `/api/board` | Opus 4.8 | Whiteboard lesson |
| `/api/board-chat` | Opus 4.8 | Board narration |
| `/api/lesson-build` | Opus 4.8 | Code lesson |
| `/api/quiz` | Opus 4.8 | Checkpoint quiz |
| `/api/build` | Opus 4.8 | Streamed app generation |
| `/api/edit` | Sonnet 4.6 | Find-and-replace edits |
| `/api/coach` | Opus 4.8 | Post-build coaching card |
| `/api/code-ask` | Opus 4.8 | Freeform code changes |
| `/api/extend` | Opus 4.8 | Extend a build part |
| `/api/speak` | — | Google Cloud TTS proxy |

## Environment variables

See `.env.example` for the full list. Key ones:

- `ANTHROPIC_API_KEY` — required for live mode (unset → demo mode)
- `WHETSTONE_DEMO=1` — force demo mode even with a key
- `WHETSTONE_THRESHOLD` — export score gate (default 80)
- `WHETSTONE_BUILDER` — connected builder: `bolt` | `v0` | `lovable` | `claude`
- `BUILDER_WEBHOOK_URL` — optional server-to-server prompt webhook

Per-role model overrides: `WHETSTONE_ADVISOR_MODEL`, `WHETSTONE_SCORING_MODEL`, `WHETSTONE_LESSON_MODEL`, `WHETSTONE_BUILDER_MODEL`, `WHETSTONE_COACH_MODEL`.

## Scoring logic

`lib/scoring.ts` is the source of truth for all scoring decisions. The model never decides `ready` — `finalizeAssessment()` always recomputes it deterministically from clamped scores. Key invariant: every dimension must clear `DIMENSION_FLOOR` (65) in addition to the overall meeting the threshold.

## Tests

Unit tests live in `tests/`. Run with `npm test`. Coverage focuses on `lib/scoring.ts` (31 cases across all public functions) and `lib/serverUtils.ts`.
