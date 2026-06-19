# Whetstone — CLAUDE.md

## What this is

Whetstone is a Next.js 16 web app that helps teen builders sharpen project ideas through voice, text, and image dialogue with a sharp CEO-advisor (Claude). It has two phases: **Sharpen** (pushback → scoreboard → refined prompt) and **Build** (Coach Spark teaches, then generates a self-contained HTML/CSS/JS app).

## Commands

```bash
npm run dev        # dev server (localhost:3000)
npm run build      # production build
npm run typecheck  # tsc --noEmit (no output = pass)
npm run lint       # eslint .
npm run start      # serve the production build
```

## Architecture

```
app/
  page.tsx           # Server component: resolves demo/threshold/builder from env
  api/               # 15 API routes (all Node.js runtime, force-dynamic)
    advisor/         # Streamed CEO-advisor reply (Sonnet 4.6, effort=low)
    score/           # JSON-schema assessment + scoring (Opus 4.8, effort=medium)
    lesson/          # Transferable lesson (Opus 4.8)
    build/           # Self-contained app generation (Opus 4.8, streamed)
    plan/            # Build plan (Opus 4.8)
    board/           # Whiteboard teaching lesson (Opus 4.8)
    lesson-build/    # Narrated code-beat lesson (Opus 4.8)
    quiz/            # Checkpoint quiz (Opus 4.8)
    coach/           # Per-step coaching note (Opus 4.8)
    code-ask/        # Code-specific Q&A (Opus 4.8)
    edit/            # Targeted find-and-replace (Opus 4.8)
    extend/          # Add a new feature part (Opus 4.8)
    export/          # Builder deep link + optional webhook
    speak/           # Google TTS (optional; falls back to browser speech)
    board-chat/      # Whiteboard conversation (Opus 4.8)

components/
  WhetstoneApp.tsx   # Main orchestrator (sharpen phase state machine)
  BuildWorkspace.tsx # Build phase state machine (profile → plan → teach → code)
  Conversation.tsx   # Chat message thread
  ScorePanel.tsx     # Scoreboard sidebar
  Whiteboard.tsx     # Hand-drawn whiteboard teaching stage
  CodeLesson.tsx     # Narrated code-beat lesson
  CheckpointQuiz.tsx # Multiple-choice checkpoint
  ...

lib/
  anthropic.ts   # SDK client + MODELS map + reasoning() helper
  types.ts       # All shared TypeScript types
  prompts.ts     # System prompts + JSON schemas for structured outputs
  scoring.ts     # Score computation (clamping, overall mean, ready gate)
  demo.ts        # Deterministic demo-mode stand-ins
  builders.ts    # Builder targets (Bolt, v0, Lovable, Claude)
  clientApi.ts   # Typed fetch wrappers for all API routes
  profile.ts     # Builder XP/profile (localStorage)
  messages.ts    # ChatMessage → Anthropic SDK message conversion
  format.ts      # uid(), copyToClipboard(), downloadText(), syntax highlight

hooks/
  useSpeechRecognition.ts  # Web Speech API voice input
  useSpeechSynthesis.ts    # Browser speech synthesis
  useTeacherVoice.ts       # Google TTS (with browser fallback)
```

## Key design decisions

- **Two-model split**: Sonnet 4.6 for live conversation (fast), Opus 4.8 for scoring/building/teaching (quality). Both overridable via env vars.
- **Adaptive thinking**: Applied automatically via `reasoning()` — only on models that support it; falls back gracefully.
- **Demo mode**: No `ANTHROPIC_API_KEY` → deterministic stand-ins. Set `WHETSTONE_DEMO=1` to force. Scores rise with engagement turns so the export flow is exercisable.
- **Scoring gate**: `overall >= threshold AND every dimension >= 65`. Both computed deterministically server-side; the model never decides "ready".
- **Dynamic criteria**: First scoring call picks 2–3 project-type-specific criteria; they're locked for the session via `criteriaRef` so the scoreboard stays stable.
- **Build output**: Coach Spark generates a single self-contained HTML file (no dependencies). Edits are targeted find-and-replace, not full regeneration.
- **No persistent backend storage**: All session state is in React state (lost on refresh). Builder profile uses localStorage.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | (none → demo mode) | Claude API access |
| `WHETSTONE_DEMO` | (off) | Force demo mode |
| `WHETSTONE_ADVISOR_MODEL` | `claude-sonnet-4-6` | Conversation model |
| `WHETSTONE_SCORING_MODEL` | `claude-opus-4-8` | Scoring + lesson model |
| `WHETSTONE_LESSON_MODEL` | `claude-opus-4-8` | Closing lesson model |
| `WHETSTONE_BUILDER_MODEL` | `claude-opus-4-8` | Code generation model |
| `WHETSTONE_COACH_MODEL` | `claude-opus-4-8` | Teaching model |
| `WHETSTONE_THRESHOLD` | `80` | Export score gate (1–100) |
| `WHETSTONE_BUILDER` | `bolt` | Builder target: bolt/v0/lovable/claude |
| `BUILDER_WEBHOOK_URL` | (none) | Server-to-server export webhook |
| `GOOGLE_TTS_API_KEY` | (none → browser TTS) | Google Cloud TTS |
| `GOOGLE_TTS_VOICE` | `en-US-Chirp3-HD-Charon` | Google TTS voice |
| `GOOGLE_TTS_LANG` | `en-US` | Google TTS language |

## What's not here (known gaps)

- **No tests**: No unit/integration/e2e tests. Scoring logic and demo mode are testable units.
- **No API auth**: All endpoints are open. Suitable for personal/internal use; add auth middleware for public deployment.
- **No persistent sessions**: Refreshing loses conversation history.
- **No rate limiting**: Add Next.js middleware or a gateway layer for production traffic.
