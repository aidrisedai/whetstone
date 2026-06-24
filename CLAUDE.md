# Whetstone — codebase guide

A Next.js 16 app that helps teen builders sharpen project ideas through AI-driven CEO-style pushback, live scoring, and a step-by-step teaching build phase (Coach Spark).

## Project layout

```
app/
  page.tsx          Root page — resolves demo/config server-side
  layout.tsx        HTML shell + fonts
  globals.css       Tailwind v4 theming (forge palette: ember, steel, amber…)
  api/              16 Next.js route handlers (one per AI job)
    advisor/        Streaming pushback dialogue
    score/          Structured-output scoring (0-100 per dimension)
    lesson/         Closing lesson synthesis
    export/         Builder deep-link + optional webhook
    build/          Streaming HTML/CSS/JS code generation
    edit/           Find-and-replace iteration
    plan/           Coach Spark build plan (parts list)
    board/          Whiteboard lesson (per part, before code)
    board-chat/     Live whiteboard Q&A
    code-ask/       Ask-while-building Q&A
    lesson-build/   Code-beat narration lesson
    quiz/           Checkpoint quiz (tied to real code)
    speak/          Google Cloud TTS voice synthesis
    extend/         Add a new build part mid-session
components/         React UI components (all client-side)
hooks/              useSpeechRecognition, useSpeechSynthesis, useTeacherVoice
lib/
  anthropic.ts      SDK client, model routing, adaptive effort helpers
  types.ts          All shared TypeScript interfaces
  prompts.ts        System prompts + JSON schemas for structured outputs
  scoring.ts        Score clamping, overall mean, ready-gate logic
  demo.ts           Deterministic demo mode stand-ins (no API key needed)
  clientApi.ts      Typed fetch wrappers for each API route
  builders.ts       Builder deep-link targets (Bolt, v0, Lovable, Claude)
  messages.ts       ChatMessage → Anthropic messages conversion
  profile.ts        Builder profile persistence (localStorage)
  format.ts         Utilities (uid, download, clipboard, format)
  serverUtils.ts    Error formatting, JSON parsing, jsonError helper
__tests__/          Vitest unit tests for pure utility functions
```

## Dev commands

```bash
npm run dev        # Start local dev server (http://localhost:3000)
npm run typecheck  # tsc --noEmit (strict mode)
npm run lint       # ESLint (Next.js + TypeScript rules)
npm run test       # Vitest unit tests
npm run build      # Production build
```

## Configuration (environment variables)

All optional — the app runs in demo mode without any `.env`.

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Enable live mode |
| `WHETSTONE_DEMO` | — | Force demo mode even with a key (`=1`) |
| `WHETSTONE_ADVISOR_MODEL` | `claude-sonnet-4-6` | Fast dialogue model |
| `WHETSTONE_SCORING_MODEL` | `claude-opus-4-8` | Grading + prompt synthesis |
| `WHETSTONE_LESSON_MODEL` | `claude-opus-4-8` | Closing lesson |
| `WHETSTONE_BUILDER_MODEL` | `claude-opus-4-8` | Code generation |
| `WHETSTONE_COACH_MODEL` | `claude-opus-4-8` | Whiteboard teacher + quizzes |
| `GOOGLE_TTS_API_KEY` | — | Natural voice (falls back to browser TTS) |
| `WHETSTONE_THRESHOLD` | `80` | Export gate score (1-100) |
| `WHETSTONE_BUILDER` | `bolt` | Export target: `bolt \| v0 \| lovable \| claude` |
| `BUILDER_WEBHOOK_URL` | — | Server-to-server prompt hand-off on export |

## Key architecture decisions

- **Split models by job**: Sonnet 4.6 for live dialogue, Opus 4.8 for judgment work (scoring, coaching, building). Each overridable via env.
- **Adaptive thinking + effort**: Derived from the model ID; only applied on models that support it (Opus 4.5+, Sonnet 4.6). Swapping in Haiku 4.5 stays valid automatically.
- **Structured outputs**: Scoring, board lesson, quiz, code-ask all use `json_schema` format to guarantee typed responses.
- **Demo mode**: Fully deterministic stand-ins for all API jobs; scores climb naturally so the full flow is explorable offline.
- **Score gate is deterministic**: `isReady` in `lib/scoring.ts` — the model never decides whether to export, the server does.
- **Self-contained builds**: The builder produces a single HTML file (inline CSS + vanilla JS) with no external dependencies.
- **Prompt caching**: System prompts carry `cache_control: { type: "ephemeral" }` for cost/speed.
