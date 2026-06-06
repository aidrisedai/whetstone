# Whetstone

AI-powered idea-sharpening tool for teen builders. Users pitch an idea, a CEO-style Claude advisor pushes back, a scoring model grades clarity/conciseness/project-fit, and once the score crosses a threshold the sharpened prompt is exported to an AI builder (Bolt, v0, Lovable, or Claude).

## Tech stack

- **Next.js 16** (App Router, all routes dynamic), **React 19**, **TypeScript 6** (strict)
- **Tailwind CSS v4** — custom "forge" palette in `app/globals.css`
- **Anthropic SDK** — two models by design: fast Sonnet for dialogue, deliberate Opus for scoring/lessons/code

## Key commands

```bash
npm run dev          # dev server
npm run build        # production build (also runs tsc)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint . --ext .ts,.tsx
```

## Architecture

```
app/
  page.tsx            # resolves demo/config, renders WhetstoneApp
  api/                # 15 server-side API routes (no client SDK calls)
components/           # React UI components
hooks/                # useSpeechRecognition, useSpeechSynthesis, useTeacherVoice
lib/
  anthropic.ts        # SDK client, MODELS map, reasoning() helper, isDemoMode()
  types.ts            # shared TypeScript interfaces
  prompts.ts          # all Claude system prompts and JSON schemas
  scoring.ts          # deterministic score computation (never trust the model for ready/overall)
  demo.ts             # deterministic offline fallback responses
  clientApi.ts        # typed fetch wrappers for every API route
  builders.ts         # Bolt/v0/Lovable/Claude deep-link builder targets
```

## Environment variables

See `.env.example` for the full list. Key ones:

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for live mode; omit for demo mode |
| `WHETSTONE_DEMO` | `0` | Force demo mode even with a key |
| `WHETSTONE_ADVISOR_MODEL` | `claude-sonnet-4-6` | Fast dialogue model |
| `WHETSTONE_SCORING_MODEL` | `claude-opus-4-8` | Deliberate scoring model |
| `WHETSTONE_THRESHOLD` | `80` | Score (0-100) required to auto-export |
| `WHETSTONE_BUILDER` | `bolt` | Target builder: bolt\|v0\|lovable\|claude |

## Important invariants

- `scoring.ts` always recomputes `overall` and `ready` deterministically — never trust the model's own output for those fields.
- `isDemoMode()` in `lib/anthropic.ts` gates all API routes; demo mode is fully functional offline.
- `reasoning()` in `lib/anthropic.ts` safely no-ops on models that don't support adaptive effort.
- History arrays are capped to 50 turns before sending to the API (`/api/advisor`).
- Prompt and code inputs are capped before forwarding (`/api/build`, `/api/speak`).
