# Whetstone

A Next.js 16 + TypeScript app that sharpens teen builders' project ideas through voice, text, and image dialogue with a Claude-powered CEO advisor. When an idea crosses a score threshold the refined prompt auto-exports to a connected AI builder (Bolt, v0, Lovable, or Claude).

## Commands

```bash
npm run dev        # start dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit tests
```

## Architecture

```
app/
  page.tsx              # root — mounts WhetstoneApp
  api/
    advisor/            # streamed advisor replies (claude-sonnet-4-6)
    score/              # structured assessment (claude-opus-4-8, JSON schema output)
    lesson/             # closing lesson (claude-opus-4-8)
    export/             # builder deeplink + optional webhook
    build/              # streamed first app build (claude-opus-4-8)
    edit/               # targeted find-and-replace edits
    plan/               # Coach Spark game plan
    coach/              # post-step teaching card
    board/              # whiteboard lesson generation
    board-chat/         # interactive whiteboard Q&A
    lesson-build/       # narrated code beats (watch-me-code)
    code-ask/           # student questions mid-lesson
    quiz/               # checkpoint multiple-choice quiz
    extend/             # add new feature to existing app
    speak/              # Google Cloud TTS (optional)
components/
  WhetstoneApp.tsx      # top-level state machine / orchestrator
  BuildWorkspace.tsx    # full build phase (plan → whiteboard → code lesson → quiz)
  CodeLesson.tsx        # beat-by-beat narrated coding lesson
  Whiteboard.tsx        # animated hand-drawn whiteboard
lib/
  anthropic.ts          # SDK setup, MODELS map, reasoning() helper, isDemoMode()
  prompts.ts            # all system prompts and JSON schemas (10 Claude jobs)
  scoring.ts            # clamp, computeOverall, isReady, finalizeAssessment
  types.ts              # shared TypeScript interfaces
  demo.ts               # deterministic demo-mode responses (no API key needed)
  builders.ts           # builder deep-link targets
  format.ts             # uid, assembleBeats, applyEdits, cleanGeneratedHtml
  serverUtils.ts        # getErrorMessage, safeParseJson, jsonError
  clientApi.ts          # client-side fetch helpers for all API routes
```

## Key Design Choices

- **Demo mode**: runs fully offline with no API key — `isDemoMode()` gates every API route; force with `WHETSTONE_DEMO=1`
- **Model split**: fast advisor (Sonnet) + deliberate judgment (Opus) — all overridable via env vars
- **Adaptive thinking**: `reasoning()` in `lib/anthropic.ts` applies `thinking: {type: "adaptive"}` only on models that support it (Opus 4.5+, Sonnet 4.6)
- **Score gating**: `isReady()` in `lib/scoring.ts` requires overall ≥ threshold AND every dimension ≥ `DIMENSION_FLOOR` (65) — no single strong score carries a weak idea
- **Self-contained output**: generated apps are single HTML files with no external deps, safe to run in an iframe offline

## Environment Variables

All optional — see `.env.example` for the full list. With no config, the app runs in demo mode.

```bash
ANTHROPIC_API_KEY=          # enables live Claude calls
WHETSTONE_DEMO=1            # force demo mode even with a key
WHETSTONE_ADVISOR_MODEL=    # default: claude-sonnet-4-6
WHETSTONE_SCORING_MODEL=    # default: claude-opus-4-8
WHETSTONE_BUILDER_MODEL=    # default: claude-opus-4-8
WHETSTONE_COACH_MODEL=      # default: claude-opus-4-8
WHETSTONE_THRESHOLD=80      # export gate (1-100)
WHETSTONE_BUILDER=bolt      # bolt | v0 | lovable | claude
GOOGLE_TTS_API_KEY=         # optional natural teacher voice
```

## Tests

Unit tests live in `__tests__/` and run with Vitest. Coverage targets:
- `lib/scoring.ts` — clamp, overall, isReady, finalizeAssessment, normalizeDynamicCriteria
- `lib/builders.ts` — getBuilder, URL generation
- `lib/format.ts` — uid, assembleBeats, beatsFormValidDoc, applyEdits, cleanGeneratedHtml
- `lib/serverUtils.ts` — getErrorMessage, safeParseJson, jsonError
- `lib/anthropic.ts` — reasoning, isDemoMode, MODELS defaults
