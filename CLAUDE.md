# Whetstone

Voice/text/image conversational app that sharpens teen builders' project ideas with a Claude-powered CEO advisor, then hands them off to an AI builder (Bolt.new, v0, Lovable, or Claude).

## Dev commands

```bash
npm run dev        # dev server at http://localhost:3000
npm run typecheck  # TypeScript validation
npm run lint       # ESLint
npm run build      # production build
```

Copy `.env.example` → `.env.local` and set `ANTHROPIC_API_KEY`. Without a key the app runs in demo mode (deterministic stand-ins, fully explorable).

## Architecture

**Two-phase flow**: sharpen phase (CEO advisor conversation → scoreboard → auto-export) → build phase (Coach Spark teaches then codes the app part-by-part).

**Models**: advisor = `claude-sonnet-4-6` (fast streaming); scoring/lesson/builder/coach = `claude-opus-4-8` (deliberate judgment). All overridable via env.

**Key directories**:
- `app/api/` — 15 Next.js API route handlers (advisor, score, lesson, export, build, edit, plan, coach, board, board-chat, lesson-build, quiz, code-ask, extend, speak)
- `components/` — React UI (WhetstoneApp orchestrator, BuildWorkspace, Whiteboard, CodeLesson, ScorePanel, etc.)
- `hooks/` — useSpeechRecognition, useSpeechSynthesis, useTeacherVoice
- `lib/` — types, anthropic client, scoring logic, prompts + JSON schemas, builder targets, demo stubs

**Voice**: Web Speech API for input; Google Cloud TTS (HD) or browser synthesis for teacher output (`/api/speak`).

**Structured outputs**: All judgment calls (scoring, lesson, coach, quiz, etc.) use `json_schema` output format. Schemas live in `lib/prompts.ts`.

## ESLint notes

The `react-hooks/purity`, `react-hooks/immutability`, and `react-hooks/set-state-in-effect` rules are disabled — they are React 19 Compiler rules and produce false positives since this project does not use `withReactCompiler`.
