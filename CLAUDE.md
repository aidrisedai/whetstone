# Whetstone

A conversational web app for teen builders that sharpens project ideas through voice, text, and image dialogue. Tagline: "Bring an idea. Leave with an edge."

## Commands

```bash
npm run dev        # dev server at localhost:3000
npm run build      # production build
npm run typecheck  # TypeScript — no emit
npm test           # Vitest unit tests (42 tests)
npm run lint       # ESLint via next lint
```

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Anthropic SDK

**Two phases:**
1. **Prompt sharpening** — A CEO-advisor (streamed) challenges the idea over multiple rounds; a separate scoring model assesses each turn against fixed (clarity, conciseness) + 2–3 dynamic criteria; when the idea clears the threshold (default 80/100 with every dimension ≥ 65) it auto-exports to the connected builder.
2. **Build & learn** — Coach Spark breaks the project into 3–5 parts, teaches each on a whiteboard before any code is written, then streams the code beat-by-beat with live narration, quiz checkpoints, and a "raise hand" escape hatch.

**Model split (all overridable via env vars):**

| Role | Default |
|------|---------|
| Advisor (live chat) | `claude-sonnet-4-6` |
| Scoring / Lesson / Builder / Coach | `claude-opus-4-8` |

## Key Files

```
app/
  page.tsx              # entry point (dynamic)
  api/                  # 15 streaming/structured API routes
    advisor/            # streamed advisor reply
    score/              # structured JSON assessment
    plan/               # build plan (3-5 parts)
    board/ board-chat/  # whiteboard lesson + student Q&A
    lesson-build/       # code beats per part
    code-ask/           # student raises hand mid-lesson
    quiz/               # checkpoint multiple-choice
    build/ edit/        # initial code gen + fast patch
    extend/             # free-form iteration post-build
    coach/ lesson/      # coach card + final lesson
    export/ speak/      # builder deep-link + TTS

components/
  WhetstoneApp.tsx      # main orchestrator (phases, state, routing)
  Composer.tsx          # text + voice + image input
  BuildWorkspace.tsx    # code editor + preview + coach rail
  Whiteboard.tsx        # hand-drawn teaching board
  ScorePanel.tsx        # live scoreboard ring + dimension bars

lib/
  types.ts              # all shared types
  scoring.ts            # clamp / computeOverall / isReady / finalizeAssessment
  format.ts             # assembleBeats / applyEdits / cleanGeneratedHtml
  prompts.ts            # system prompts + JSON schemas
  demo.ts               # deterministic offline demo mode
  anthropic.ts          # SDK init, model config, demo-mode check
  clientApi.ts          # typed fetch wrappers for every API route

hooks/
  useVoiceInput.ts      # Web Speech API (mic)
  useTTS.ts             # TTS playback (Google or browser)
  useAutoScroll.ts      # conversation scroll

__tests__/
  scoring.test.ts       # 28 tests — pure scoring logic
  format.test.ts        # 14 tests — beat assembly, edits, HTML cleaning
```

## Environment Variables (all optional)

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Real Claude; omit for demo mode |
| `WHETSTONE_DEMO` | — | Force demo mode (`1`) even with a key |
| `WHETSTONE_THRESHOLD` | `80` | Score needed to auto-export |
| `WHETSTONE_ADVISOR_MODEL` | `claude-sonnet-4-6` | Fast advisor |
| `WHETSTONE_SCORING_MODEL` | `claude-opus-4-8` | Grader |
| `WHETSTONE_LESSON_MODEL` | `claude-opus-4-8` | Final lesson |
| `WHETSTONE_BUILDER_MODEL` | `claude-opus-4-8` | Code generation |
| `WHETSTONE_COACH_MODEL` | `claude-opus-4-8` | Teaching + quizzes |
| `WHETSTONE_BUILDER` | `bolt` | Target builder: `bolt\|v0\|lovable\|claude` |
| `BUILDER_WEBHOOK_URL` | — | Server-to-server hand-off on export |
| `GOOGLE_TTS_API_KEY` | — | HD voice (Chirp3); falls back to Web Speech |
| `GOOGLE_TTS_ACCESS_TOKEN` | — | OAuth alternative to API key |
| `GOOGLE_TTS_VOICE` | — | e.g. `en-US-Chirp3-HD-Charon` |
| `GOOGLE_TTS_LANG` | `en-US` | Language tag |

## Demo Mode

Without `ANTHROPIC_API_KEY` set (or with `WHETSTONE_DEMO=1`), all API routes return deterministic pre-scripted responses from `lib/demo.ts`. Fully offline — great for UI development and CI.

## Scoring Invariants

Scores are clamped client-side in `lib/scoring.ts` — never trust the model to produce bounded numbers or decide the export threshold. `finalizeAssessment` is the only place `ready` is computed. The CI runs 42 unit tests covering every branch of this logic.

## CI

`.github/workflows/ci.yml` runs typecheck → tests → build on every push and PR. The build step uses `WHETSTONE_DEMO=1` so no API key is needed in CI.
