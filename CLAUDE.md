# Whetstone — CLAUDE.md

A conversational web app that sharpens teen builders' project ideas through voice, text, and image dialogue, then guides them through building and learning to code.

## Quick start

```bash
npm install
npm run dev          # demo mode (no API key needed)
```

Add `ANTHROPIC_API_KEY` to `.env.local` for the real advisor, scorer, and builder. See `.env.example` for all options.

## Architecture

```
Browser  ──────────────────────────────────────────────
  components/WhetstoneApp.tsx   ← main orchestrator
  components/BuildWorkspace.tsx ← build + teach + quiz UI

Next.js App Router (server)  ──────────────────────────
  app/api/advisor/     ← streaming chat       (Sonnet 4.6)
  app/api/score/       ← structured scoring   (Opus 4.8)
  app/api/lesson/      ← session lesson       (Opus 4.8)
  app/api/plan/        ← build plan           (Opus 4.8)
  app/api/board/       ← whiteboard lesson    (Opus 4.8)
  app/api/board-chat/  ← whiteboard Q&A       (Opus 4.8)
  app/api/lesson-build/← code lesson + beats  (Opus 4.8)
  app/api/quiz/        ← checkpoint quiz      (Opus 4.8)
  app/api/build/       ← streaming HTML build (Opus 4.8)
  app/api/edit/        ← find-and-replace     (Opus 4.8)
  app/api/extend/      ← open-ended extension (Opus 4.8)
  app/api/code-ask/    ← Q&A about the code   (Opus 4.8)
  app/api/coach/       ← coaching card        (Opus 4.8)
  app/api/export/      ← builder deep link + webhook
  app/api/speak/       ← Google TTS or browser TTS

Anthropic SDK  ─────────────────────────────────────────
  lib/anthropic.ts  ← client, models, reasoning config
```

## Key design decisions

**Dual-model strategy** — `claude-sonnet-4-6` handles live dialogue (fast, responsive); `claude-opus-4-8` handles all judgment work (scoring, lesson, code). Both are configurable via env vars.

**Demo mode** — when `ANTHROPIC_API_KEY` is absent (or `WHETSTONE_DEMO=1`), all API routes serve deterministic stand-in responses from `lib/demo.ts`. The full sharpen → build → teach flow works offline.

**Scoring is deterministic on the server** — the model never decides `ready`. `lib/scoring.ts::finalizeAssessment` always computes `overall` and `ready` from raw dimension scores. The model just provides scores and rationale.

**Session-stable criteria** — once the scoring model picks 2–3 dynamic criteria for a session, `normalizeDynamicCriteria` locks them to the prior set so the scoreboard doesn't shift between turns.

**Adaptive thinking** — `lib/anthropic.ts::reasoning()` returns `{ thinking: { type: "adaptive" }, output_config: { effort } }` only for models that support it (Opus 4.5+, Sonnet 4.6). Any other model gets no extra params, keeping the code swap-safe.

**Streaming** — advisor, build, edit, and extend routes stream plain text via `ReadableStream` + `text/plain` headers. Score, plan, board, lesson, quiz routes return structured JSON.

## Core library modules

| File | Purpose |
|------|---------|
| `lib/types.ts` | All TypeScript interfaces (19 types) |
| `lib/anthropic.ts` | SDK client, model names, reasoning config, demo detection |
| `lib/prompts.ts` | All system prompts and JSON schemas for structured outputs |
| `lib/demo.ts` | Deterministic stand-in responses for every API route |
| `lib/scoring.ts` | Threshold logic: clamp, computeOverall, isReady, finalizeAssessment |
| `lib/messages.ts` | ChatMessage → Anthropic MessageParam conversion |
| `lib/format.ts` | uid, assembleBeats, applyEdits, cleanGeneratedHtml, etc. |
| `lib/clientApi.ts` | Client-side fetch wrappers for all API routes |
| `lib/builders.ts` | Deep-link URL builders for Bolt, v0, Lovable, Claude |
| `lib/profile.ts` | Builder profile persistence (localStorage) |
| `lib/serverUtils.ts` | jsonError, safeParseJson, getErrorMessage |

## Development commands

```bash
npm run dev           # Next.js dev server (hot reload)
npm run typecheck     # tsc --noEmit (strict mode)
npm test              # vitest run (unit tests)
npm run test:watch    # vitest watch mode
npm run build         # production build (set WHETSTONE_DEMO=1 if no API key)
```

## Unit tests

Tests live alongside the modules they cover:

```
lib/scoring.test.ts      — clamp, computeOverall, isReady, finalizeAssessment, normalizeDynamicCriteria
lib/format.test.ts       — uid, assembleBeats, beatsFormValidDoc, applyEdits, cleanGeneratedHtml
lib/serverUtils.test.ts  — safeParseJson, jsonError, getErrorMessage
lib/messages.test.ts     — toAnthropicMessages, criteriaReuseMessage
```

## Environment variables

All optional — the app runs in demo mode with zero config.

| Variable | Default | Notes |
|----------|---------|-------|
| `ANTHROPIC_API_KEY` | — | If absent, demo mode activates automatically |
| `WHETSTONE_DEMO` | `"0"` | Force demo mode even when a key is present |
| `WHETSTONE_THRESHOLD` | `80` | Minimum overall score (1–100) to unlock export |
| `WHETSTONE_ADVISOR_MODEL` | `claude-sonnet-4-6` | Live chat model |
| `WHETSTONE_SCORING_MODEL` | `claude-opus-4-8` | Scoring + structured output model |
| `WHETSTONE_LESSON_MODEL` | `claude-opus-4-8` | Session lesson model |
| `WHETSTONE_BUILDER_MODEL` | `claude-opus-4-8` | HTML code generation model |
| `WHETSTONE_COACH_MODEL` | `claude-opus-4-8` | Whiteboard + coach model |
| `WHETSTONE_CONNECTED_BUILDER` | `bolt` | Default builder target (bolt/v0/lovable/claude) |
| `WHETSTONE_WEBHOOK_URL` | — | Optional webhook URL called on export |
| `GOOGLE_TTS_API_KEY` | — | Enables Google Cloud TTS (Chirp3-HD voices) |

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and PR to `main`:
1. `npm run typecheck` — TypeScript strict check
2. `npm test` — 80 unit tests via vitest
3. `npm run build` — Next.js production build (with `WHETSTONE_DEMO=1`)
