# Whetstone — Developer Guide

## What this is

Whetstone is a Next.js 16 / React 19 web app: a conversational AI advisor for teen builders. Users pitch project ideas through text, voice, or images; a CEO-style advisor pressure-tests them via structured dialogue; a real-time scoreboard tracks idea quality; and once the idea crosses a configurable threshold it is exported to an AI builder (Bolt.new, v0, Lovable, or Claude).

## Running locally

```bash
cp .env.example .env.local   # then set ANTHROPIC_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

Zero-config demo mode (no API key required): set `WHETSTONE_DEMO=true` or leave `ANTHROPIC_API_KEY` unset. The deterministic offline path in `lib/demo.ts` drives the entire flow.

## Key commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run lint` | ESLint across all `.ts`/`.tsx` files |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Coverage report (v8) |

## Directory layout

```
app/
  page.tsx            — root page, boots WhetstoneApp
  layout.tsx          — HTML shell + metadata
  api/                — 15 Next.js route handlers (streaming + structured output)
    advisor/          — live chat (streamed, Sonnet 4.6)
    score/            — structured assessment (Opus 4.8)
    lesson/           — closing lesson (Opus 4.8)
    export/           — builder deep-link + optional webhook
    build/            — initial HTML app generation (streamed)
    edit/             — targeted find-and-replace iterations
    plan/             — Coach Spark build plan
    coach/            — per-step coaching note
    quiz/             — checkpoint quiz generation
    board/            — whiteboard lesson (structured)
    board-chat/       — whiteboard teaching dialogue (streamed)
    code-ask/         — code-specific follow-up (streamed)
    extend/           — extended code building (streamed)
    lesson-build/     — code beat narration (structured)
    speak/            — Google TTS audio fallback

components/           — 17 React components (UI only, no AI calls)
  WhetstoneApp.tsx    — top-level orchestrator
  BuildWorkspace.tsx  — build + code preview (largest, 774L)
  Whiteboard.tsx      — hand-drawn teaching canvas
  CodeLesson.tsx      — code narration/beats

hooks/                — 3 hooks (voice input/output)
lib/
  types.ts            — all shared TypeScript types
  scoring.ts          — score clamping, overall mean, export gate
  builders.ts         — builder registry + URL generation
  format.ts           — pure text/HTML utilities (applyEdits, assembleBeats, etc.)
  serverUtils.ts      — safeParseJson, jsonError, getErrorMessage
  prompts.ts          — all AI system prompts (707L)
  demo.ts             — deterministic offline demo path
  anthropic.ts        — SDK setup + prompt caching
  clientApi.ts        — client-side API call helpers
  profile.ts          — localStorage builder profile
  messages.ts         — shared message shape helpers

__tests__/            — Vitest unit tests (scoring, builders, format, serverUtils)
```

## Model strategy

| Role | Model | Why |
|------|-------|-----|
| Advisor (live chat) | Sonnet 4.6 | Speed → conversation flow |
| Scoring | Opus 4.8 | Judgment > speed |
| Lesson, plan, coach, quiz, whiteboard | Opus 4.8 | Quality, one-shot |
| Build (code gen) | Sonnet 4.6 (streams) | Real-time UX |
| Google TTS fallback | N/A | MP3 audio |

All model IDs are overridable via env vars — see `.env.example`.

## Environment variables

See `.env.example` for the full list (20 variables). Critical ones:

- `ANTHROPIC_API_KEY` — required for live mode (omit for demo mode)
- `WHETSTONE_DEMO=true` — force offline demo regardless of key
- `WHETSTONE_THRESHOLD` — export gate (default 80, range 1-100)
- `WHETSTONE_BUILDER` — default export target (`bolt`/`v0`/`lovable`/`claude`)

## Testing

Tests live in `__tests__/` and cover the pure logic in `lib/`:

- `scoring.test.ts` — clamp, dimensionScores, computeOverall, isReady, finalizeAssessment, normalizeDynamicCriteria
- `builders.test.ts` — BUILDERS registry, getBuilder, activeBuilder
- `format.test.ts` — assembleBeats, beatsFormValidDoc, cleanGeneratedHtml, applyEdits
- `serverUtils.test.ts` — safeParseJson, jsonError, getErrorMessage (Anthropic SDK mocked)

## Known issues / tech debt

- `BuildWorkspace.tsx` (774L) and `lib/prompts.ts` (707L) are candidates for modularization
- PostCSS has a moderate CVE (GHSA-qx2v-qp2m-jg93); the only npm fix would downgrade Next.js to 9.x — do not apply `npm audit fix --force`
- No Sentry/error tracking, no rate limiting on API routes, no request validation middleware — acceptable for beta, needed before broad production launch
