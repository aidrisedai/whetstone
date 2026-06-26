# Whetstone — Claude Code context

## What this is
Next.js 16 + React 19 + TypeScript app. AI-powered conversational advisor for teen builders. Two phases: **sharpen** (pitch → score → export) and **build** (Coach Spark teaches + codes part-by-part).

## Key commands
```bash
npm run dev        # dev server at localhost:3000
npm run build      # production build (must pass before merging)
npm run typecheck  # tsc --noEmit — run after any type-touching change
```

Demo mode (no API key needed): set `WHETSTONE_DEMO=1` or leave `ANTHROPIC_API_KEY` unset.

## Architecture
- `app/api/` — 15 Next.js route handlers (all `runtime = "nodejs"`, `dynamic = "force-dynamic"`)
- `components/` — React client components; `WhetstoneApp.tsx` is the top-level orchestrator
- `lib/anthropic.ts` — model names + `reasoning()` helper (adaptive effort); `isDemoMode()`
- `lib/scoring.ts` — deterministic score math (`clamp`, `computeOverall`, `isReady`, `finalizeAssessment`)
- `lib/prompts.ts` — system prompts + JSON schemas for structured outputs
- `lib/demo.ts` — deterministic stand-ins for all API routes in demo mode
- `lib/types.ts` — shared TypeScript interfaces (source of truth for data shapes)

## Model split
| Role | Default | Env override |
|---|---|---|
| Advisor (streaming) | `claude-sonnet-4-6` | `WHETSTONE_ADVISOR_MODEL` |
| Scoring + lesson | `claude-opus-4-8` | `WHETSTONE_SCORING_MODEL` / `WHETSTONE_LESSON_MODEL` |
| Builder (code gen) | `claude-opus-4-8` | `WHETSTONE_BUILDER_MODEL` |
| Coach Spark | `claude-opus-4-8` | `WHETSTONE_COACH_MODEL` |

`reasoning()` in `lib/anthropic.ts` gates adaptive thinking + effort to models that support it; swapping in Haiku stays safe.

## Scoring rules (never change without tests)
- Overall = mean of all dimension scores (clamped 0–100)
- Export unlocks when `overall >= threshold` (default 80) **AND** every dimension >= 65
- Dynamic criteria are locked after the first assessment and reused for the session
- `finalizeAssessment()` is the single authoritative normalizer — the model never decides readiness

## Things to watch
- No test suite yet — be careful editing `lib/scoring.ts` and `lib/demo.ts`
- No auth/rate limiting on API routes — acceptable for private/demo use; add before public launch
- Voice (Web Speech API) requires Chrome/Edge; gracefully hidden elsewhere
- Build output is a single self-contained HTML file (no external deps) — keep it that way
