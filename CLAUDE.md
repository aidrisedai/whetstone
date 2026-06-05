# Whetstone — Developer Notes

## What this is

Whetstone is a Next.js 16 (App Router) web app that acts as a conversational AI advisor for teenage builders. It runs in two phases:

1. **Sharpen** — A CEO advisor (Claude) pushes back on the teen's idea through voice, text, and image dialogue until it clears a score threshold.
2. **Build** — Coach Spark (Claude) breaks the refined idea into teachable parts and guides the builder through narrated coding lessons with live quizzes and a whiteboard teaching board.

## Commands

```bash
npm run dev          # Start local dev server (http://localhost:3000)
npm run typecheck    # TypeScript strict check (must pass clean)
npm run lint         # ESLint via next lint
npm test             # Vitest unit tests (run once)
npm run test:watch   # Vitest in watch mode
npm run build        # Next.js production build
```

## Environment

Copy `.env.example` to `.env.local` and set at minimum:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Without a key, the app runs in **demo mode** (deterministic offline responses). Demo mode exercises the full UI flow end-to-end without consuming API credits.

Optional: `GOOGLE_TTS_API_KEY` for high-quality teacher voice; falls back to browser speech.

## Project layout

```
app/            Next.js App Router (page.tsx + 15 API routes)
components/     React UI (WhetstoneApp.tsx is the root orchestrator)
hooks/          Browser APIs: speech recognition, speech synthesis, teacher voice
lib/            Shared logic: scoring.ts, format.ts, prompts.ts, types.ts, ...
__tests__/      Vitest unit tests for pure utility functions
```

## Model split (intentional)

| Role           | Default model          | Why                                      |
|----------------|------------------------|------------------------------------------|
| Advisor        | claude-sonnet-4-6      | Fast streaming for live conversation     |
| Scoring/Lesson | claude-opus-4-8        | Deliberate judgment; runs after the chat |
| Builder/Coach  | claude-opus-4-8        | Code quality + structured lesson output  |

Override any model via env vars (see `.env.example`). Adaptive thinking is applied automatically only on models that support it.

## Scoring gate

`WHETSTONE_THRESHOLD` (default 80) is the overall score an idea must reach. Additionally, every dimension must clear `DIMENSION_FLOOR` (65) — a single strong score cannot carry a weak idea. Both are enforced server-side in `lib/scoring.ts`; the model never decides the gate.

## Testing approach

- **Unit tests**: Pure functions in `lib/scoring.ts` and `lib/format.ts` are covered by Vitest in `__tests__/`.
- **Type safety**: TypeScript strict mode; `npm run typecheck` must pass clean.
- **Build validation**: `npm run build` must produce a clean production build.
- **Manual**: For UI and API route behaviour, run the dev server and step through the full flow in a browser (or use demo mode for offline testing).

## CI

GitHub Actions runs on every push and PR: typecheck → lint → unit tests → production build. See `.github/workflows/ci.yml`.

## Key files to know

| File | Purpose |
|------|---------|
| `lib/prompts.ts` | All system prompts + JSON output schemas for every API route |
| `lib/scoring.ts` | Threshold logic — the only place `ready` is computed |
| `lib/types.ts` | Shared TypeScript interfaces (Assessment, BuildPlan, CodeBeat, …) |
| `lib/demo.ts` | Deterministic demo responses for offline UI work |
| `components/WhetstoneApp.tsx` | Root React component; owns all phase state |
