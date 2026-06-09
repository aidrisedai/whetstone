# Whetstone

A Next.js 16 / React 19 / TypeScript app that sharpens teen builders' project ideas through a multi-turn CEO-advisor dialogue, live scoring, and a gamified "Coach Spark" build phase.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

No API key needed — demo mode runs end-to-end with deterministic stand-ins.

## Commands

```bash
npm run dev        # Next.js dev server
npm run build      # Production build
npm run typecheck  # tsc --noEmit (zero errors expected)
npm test           # Vitest unit tests (73 tests across 5 suites)
npm run test:watch # Watch mode
```

## Architecture

```
app/api/          16 Next.js API routes (all server-side, runtime: nodejs)
components/       18 React components (WhetstoneApp.tsx is the top-level orchestrator)
hooks/            3 custom hooks (voice input/output, Google TTS)
lib/              Core logic
  anthropic.ts    SDK client, MODELS map, reasoning(), isDemoMode()
  prompts.ts      All system prompts + JSON schemas
  demo.ts         Deterministic demo-mode responses
  types.ts        Shared TypeScript types
  scoring.ts      Score clamping, threshold logic, finalizeAssessment()
  clientApi.ts    Client-side fetch wrappers for all API routes
  serverUtils.ts  Error formatting, safeParseJson()
  messages.ts     Anthropic message conversion
  builders.ts     Builder targets (bolt, v0, lovable, claude)
  format.ts       cleanGeneratedHtml(), applyEdits(), beat assembly
```

## Key env vars (all optional)

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Real Claude; unset = demo mode |
| `WHETSTONE_DEMO=1` | — | Force demo even with a key |
| `WHETSTONE_ADVISOR_MODEL` | claude-sonnet-4-6 | Conversation model |
| `WHETSTONE_SCORING_MODEL` | claude-opus-4-8 | Scoring + prompt synthesis |
| `WHETSTONE_BUILDER_MODEL` | claude-opus-4-8 | Code generation |
| `WHETSTONE_COACH_MODEL` | claude-opus-4-8 | Teaching cards |
| `WHETSTONE_THRESHOLD` | 80 | Export score floor (1–100) |
| `WHETSTONE_BUILDER` | bolt | Target builder (bolt\|v0\|lovable\|claude) |
| `GOOGLE_TTS_API_KEY` | — | Natural teacher voice (optional) |

See `.env.example` for the full list.

## Testing

Pure utility functions are tested with Vitest (`__tests__/`):
- `scoring.test.ts` — clamp, computeOverall, isReady, finalizeAssessment, normalizeDynamicCriteria
- `format.test.ts` — cleanGeneratedHtml, applyEdits, beat assembly, beatsFormValidDoc
- `serverUtils.test.ts` — safeParseJson, getErrorMessage
- `builders.test.ts` — getBuilder, buildUrl URL encoding
- `messages.test.ts` — toAnthropicMessages, criteriaReuseMessage

API routes and components are not directly unit-tested; they depend on the Anthropic SDK and are covered by type safety + the production build check.

## Notes

- Adaptive thinking (`thinking: { type: "adaptive" }`) and `effort` are only applied to Opus 4.5+ and Sonnet 4.6 — see `lib/anthropic.ts:supportsAdaptiveEffort`. Swapping to Haiku works without touching code.
- Prompt caching (`cache_control: { type: "ephemeral" }`) is applied to system messages on every route that calls the advisor, scorer, coach, or builder.
- The `postcss` audit advisory (`npm audit`) is a false positive — PostCSS runs build-time only and never processes untrusted input.
