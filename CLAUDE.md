# Whetstone — Codebase Guide

Whetstone is a Next.js 16 / React 19 / TypeScript 6 web app. A CEO-advisor AI sharpens a teen builder's project idea through conversation, then hands it off to an AI builder (Bolt, v0, Lovable, or Claude).

## Quick start

```bash
npm install
npm run dev          # demo mode works with no API key
```

Set `ANTHROPIC_API_KEY` in `.env.local` for real Claude responses. See `.env.example` for all options.

## Architecture

### User flow
1. **Idea intake** — user submits their project idea (text + optional images/voice)
2. **Advisor conversation** — Claude Sonnet pushes back, asks questions, sharpens the idea
3. **Scoring** — Claude Opus scores the idea across 5 dimensions; once ≥ threshold it auto-exports
4. **Export** — refined prompt sent to the connected AI builder + optional webhook
5. **Closing lesson** — one transferable lesson the builder keeps forever
6. **Build phase (optional)** — plan → whiteboard lesson → code → checkpoint quiz, repeating per part

### Model split (by design)
| Job | Default model | Reason |
|-----|--------------|--------|
| Advisor conversation | `claude-sonnet-4-6` | Fast streaming; low latency |
| Scoring + lesson | `claude-opus-4-8` | Deliberate, high-quality judgment |
| Builder (code gen) | `claude-opus-4-8` | Best code output |
| Coach + whiteboard | `claude-opus-4-8` | Teaching quality |

All models are overridable via env vars — see `.env.example`.

### Demo mode
When `ANTHROPIC_API_KEY` is unset (or `WHETSTONE_DEMO=1`), every API route returns deterministic stand-ins from `lib/demo.ts`. The score climbs across turns so the full flow (pushback → export → lesson → build) is explorable with zero config.

## Directory map

```
app/
  page.tsx          — entry point; resolves demo/threshold/builder from env
  layout.tsx        — root layout + metadata
  globals.css       — Tailwind v4 theme tokens
  api/              — 15 serverless API routes (all stateless, streamable)
    advisor/        — streaming CEO-advisor reply
    score/          — structured JSON assessment (5 dimensions)
    lesson/         — closing transferable lesson
    export/         — builder deep-link + optional webhook POST
    build/          — streaming self-contained HTML app generation
    plan/           — build plan (parts list) generation
    coach/          — per-step coaching card
    board/          — whiteboard lesson JSON
    board-chat/     — Q&A during whiteboard teaching
    lesson-build/   — narrated code beats for a build part
    code-ask/       — student question about on-screen code
    quiz/           — checkpoint quiz questions
    edit/           — targeted find-and-replace edits
    extend/         — extend existing app code
    speak/          — Google TTS → WAV audio

components/
  WhetstoneApp.tsx  — top-level orchestrator: all state, phase transitions
  BuildWorkspace.tsx — build phase (plan cards, coach, edit loop)
  Whiteboard.tsx    — hand-drawn whiteboard with live captions + HD voice
  CodeLesson.tsx    — spotlight code editor + ask-while-building
  Conversation.tsx  — chat history
  Composer.tsx      — text + mic + image input
  ScorePanel.tsx    — dimension bars + score ring
  ExportCard.tsx    — export confirmation + builder link
  CheckpointQuiz.tsx — multiple-choice quiz after each build part
  (+ Caption, LessonCard, MessageBubble, ScoreRing, DimensionBar, CodeViewer, icons)

lib/
  types.ts          — all shared TypeScript interfaces (source of truth)
  anthropic.ts      — SDK client, model selection, demo detection
  prompts.ts        — system prompts + Zod-style JSON schemas for structured output
  demo.ts           — deterministic demo responses
  scoring.ts        — threshold logic, dimension normalization (NEVER trust the model for ready/overall)
  clientApi.ts      — fetch wrappers used by components
  messages.ts       — chat history → Anthropic message format conversion
  builders.ts       — connected builder URL generation
  serverUtils.ts    — error formatting, JSON extraction from model output
  format.ts         — uid(), clipboard helpers
  profile.ts        — LocalStorage builder profile (XP, concepts learned, etc.)

hooks/
  useSpeechRecognition.ts — browser speech-to-text
  useSpeechSynthesis.ts   — browser TTS fallback
  useTeacherVoice.ts      — Google TTS (HD WAV) with browser fallback + pause/resume
```

## Key invariants

- **Scoring is deterministic**: `lib/scoring.ts` computes `overall` and `ready` from clamped scores. The model never decides if an idea is ready — that's always recalculated server-side.
- **All API routes are stateless**: no database; conversation history is passed in the request body each time.
- **Secrets server-side only**: `ANTHROPIC_API_KEY` and Google TTS keys are read only in API routes (Node runtime), never in client components.
- **Demo mode is zero-config**: every route has a demo branch; nothing errors without a key.

## Scripts

```bash
npm run dev        # development server (hot reload)
npm run build      # production build (Next.js)
npm run start      # production server
npm run typecheck  # tsc --noEmit (no test suite yet)
```

## Known limitations

- No automated test suite — manual QA required across all flows
- Voice (speech recognition + TTS) is Chrome/Edge only in demo mode; Google TTS works cross-browser
- Build output is a single self-contained HTML file (no npm packages in generated code)
- No user accounts — builder profile lives in LocalStorage only
- The postcss moderate-severity CVE (GHSA-qx2v-qp2m-jg93) cannot be fixed without downgrading Next.js to 9.3.3; it is a build-time-only issue and does not affect runtime users
