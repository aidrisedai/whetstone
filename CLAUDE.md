# Whetstone

A Next.js app that helps teen builders sharpen project ideas through conversational AI feedback, live scoring, and a guided build phase with Claude.

## Stack

- **Framework**: Next.js 16 (App Router, `app/` directory)
- **Language**: TypeScript (strict mode, target ES2022)
- **AI**: Anthropic SDK 0.100.1 — two Claude models in parallel:
  - `claude-sonnet-4-6` → advisor (live chat, fast streaming)
  - `claude-opus-4-8` → scoring, lessons, build, coach (deliberate judgment)
- **CSS**: Tailwind v4 via PostCSS (`globals.css` defines the "forge" palette)
- **Voice**: Web Speech API (input) + Google Cloud TTS (output, optional)

## Key commands

```bash
npm run dev        # dev server on localhost:3000
npm run build      # production build (must stay green)
npm run typecheck  # tsc --noEmit (must stay clean)
```

## Project layout

```
app/
  page.tsx          — entry, reads env, chooses demo vs. live mode
  layout.tsx        — root layout + fonts
  api/              — 15 API routes (advisor, score, lesson, build, edit, …)
components/         — React components (WhetstoneApp is the main orchestrator)
hooks/              — useSpeechRecognition, useSpeechSynthesis, useTeacherVoice
lib/
  types.ts          — shared TypeScript interfaces (read first when touching data shapes)
  anthropic.ts      — SDK client, MODELS constants, reasoning() helper
  scoring.ts        — pure scoring math (clamp, computeOverall, isReady, normalize)
  prompts.ts        — all system prompts and JSON schemas (~38 KB)
  demo.ts           — deterministic stubs for every API route (no API key needed)
  clientApi.ts      — fetch helpers used by components
  builders.ts       — Bolt / v0 / Lovable / Claude deep-link targets
```

## Demo mode

Works with **no `ANTHROPIC_API_KEY`** — all API routes detect `isDemoMode()` and return deterministic stubs. Set `WHETSTONE_DEMO=1` to force demo even when a key is present.

## Environment variables

See `.env.example` for the full list. Required for live mode:

```
ANTHROPIC_API_KEY          # enables real Claude
```

Optional:
```
WHETSTONE_ADVISOR_MODEL    # default: claude-sonnet-4-6
WHETSTONE_SCORING_MODEL    # default: claude-opus-4-8
WHETSTONE_LESSON_MODEL     # default: claude-opus-4-8
WHETSTONE_BUILDER_MODEL    # default: claude-opus-4-8
WHETSTONE_COACH_MODEL      # default: claude-opus-4-8
WHETSTONE_THRESHOLD        # score to cross before export (default: 80)
WHETSTONE_BUILDER          # bolt | v0 | lovable | claude (default: bolt)
BUILDER_WEBHOOK_URL        # optional server-to-server hand-off
GOOGLE_TTS_API_KEY         # enables HD teacher voice
GOOGLE_TTS_ACCESS_TOKEN    # alternative auth for Google TTS
GOOGLE_TTS_VOICE           # default: en-US-Chirp3-HD-Charon
GOOGLE_TTS_LANG            # default: en-US
```

## Adding a new API route

1. Create `app/api/<name>/route.ts` with `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`.
2. Guard with `isDemoMode()` and add a stub to `lib/demo.ts`.
3. Add the fetch helper to `lib/clientApi.ts`.
4. Run `npm run typecheck && npm run build` to confirm the route compiles.

## Scoring model

- Two fixed dimensions: `clarity` and `conciseness`.
- Three dynamic dimensions (project-type-specific), locked after the first assessment.
- `overall` = mean of all dimension scores (clamped 0–100).
- `ready` = `overall >= threshold` AND every dimension `>= 65` (the floor, `DIMENSION_FLOOR`).
- The server **always** computes `overall` and `ready` — the model never decides them.

## SDK patterns used

- `thinking: { type: "adaptive" }` + `output_config: { effort }` — both require Opus 4.5+ or Sonnet 4.6; guarded by `supportsAdaptiveEffort()` in `lib/anthropic.ts`.
- `output_config.format: { type: "json_schema", schema }` — structured output for scoring, edits, coach, plan, etc.
- `cache_control: { type: "ephemeral" }` on system prompts — prompt caching across turns.
