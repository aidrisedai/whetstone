# Whetstone

**Bring an idea. Leave with an edge.**

Whetstone is a conversational web app for teen builders. You pitch a project idea;
a sharp CEO‑advisor — speaking through **voice, text, and images** — pushes back,
question by question, until the idea is clear, tight, and specific. Every version
of the idea is **scored live**. When the score crosses a defined threshold, the
sharpened, builder‑ready prompt is **automatically exported to a connected AI
builder**, and the session ends with **one transferable lesson** you can carry to
the next thing you build.

```
pitch  →  sharpen (a few rounds)  →  plan the build (teach first, no code yet)
       →  approve each part → it gets coded & the app grows → +XP & a concept learned
       →  one lesson
```

Whetstone has two halves: a **prompt‑sharpening** phase (a sharp advisor + a live
scoreboard) and a **building** phase where a game‑loving engineering manager,
**Coach Spark**, breaks the project into pieces and *teaches each one before any
code is written* — then codes it the moment the young builder approves. You don't
have to keep prompting — after a round or two you jump straight into planning the
build.

---

## How it works

1. **Pitch.** Type or speak your idea, or drop in a sketch / mockup / screenshot.
2. **Get sharpened.** The advisor — a tough‑but‑caring founder‑mentor — finds the
   vaguest, most‑assumed part of your idea and pressure‑tests it with one or two
   pointed questions. It never writes your pitch for you; you do the forging.
3. **Watch the scoreboard.** Each turn is scored on two **fixed** dimensions —
   **clarity** and **conciseness** — plus **2–3 dynamic criteria chosen for your
   project type**, each drawn from Claude prompt‑engineering best practices.
4. **Cross the bar.** When the overall score clears the threshold (and no single
   dimension lags), the refined prompt auto‑exports to your connected builder
   (default **Bolt.new**) — opened by a one‑click hand‑off and/or POSTed to a
   webhook if you've wired one.
5. **Take the lesson.** The session closes with a single, transferable principle,
   grounded in what actually happened in your conversation.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

That's it — **Whetstone runs with zero configuration in demo mode.** With no API
key, it serves deterministic stand‑in advisor replies, a scoreboard that climbs as
you engage, a real auto‑export, and a closing lesson, so the whole flow is
explorable offline.

To wake the **real Claude‑powered advisor**, add a key:

```bash
cp .env.example .env.local
# edit .env.local and set ANTHROPIC_API_KEY=...
npm run dev
```

Production build:

```bash
npm run build && npm run start
```

---

## The scoring model

Every prompt is graded 0–100 on each dimension. The overall score is the mean of
all dimensions, computed deterministically server‑side (the model never decides
the threshold). Export unlocks when **overall ≥ threshold (default 80)** *and*
**every dimension clears a floor (65)** — so one strong score can't carry a weak
idea.

| Kind        | Dimensions                                                                 |
| ----------- | -------------------------------------------------------------------------- |
| **Fixed**   | Clarity · Conciseness — scored on *every* prompt                           |
| **Dynamic** | 2–3 criteria chosen for the detected project type, on the first assessment |

The dynamic criteria are pulled from a catalog of Claude prompt‑engineering best
practices (`define_audience`, `success_criteria`, `set_constraints_and_scope`,
`core_mechanic`, `assign_role_or_persona`, `data_and_sources`,
`specify_output_format`, `handle_edge_cases`, …) and then **held stable for the
rest of the session** so the scoreboard tells a consistent story. For example:

- **Web/SaaS app** → Audience · Success criteria · Scope & constraints
- **Game** → Core mechanic · Win/lose state · Look & feel
- **AI assistant** → Persona & voice · Knowledge & sources · Edge cases
- **Data tool** → Data & sources · Output & format · Success criteria

Each dimension comes back with a one‑line rationale and one concrete, actionable
suggestion — the nudges that drive the dialogue forward.

---

## Building it — plan first, then code (Coach Spark)

Once there's a refined prompt — even after a single sharpening round — a **Build
it** button appears and hands off to **Coach Spark**, a game‑loving engineering
manager who teaches *before* a single line of code is written. The whole phase is
tuned for a 10–11‑year‑old who'd rather be gaming:

- **Quick builder profile.** Name + favorite game (saved in `localStorage`). The
  profile **grows** as they build — XP, levels, and a list of concepts learned —
  and is reused to personalize future sessions.
- **The game plan (no code yet).** Coach Spark (Opus 4.8) breaks the project into
  **3–5 buildable parts**, each with a fun title, a plain‑language *what it is*, an
  engineering‑manager *why we build it (and why now)*, and the **one concept**
  they'll learn. Favorite‑game analogies are woven in.
- **Teach → approve → build, part by part.** For each part the kid sees the
  explanation, then taps **"Build it!"** — only *then* is the code generated. The
  first part is a full, streamed file (Sonnet 4.6); each later part is added to the
  **same app** via fast targeted edits (with a full‑rebuild fallback), so the app
  visibly **grows** one accepted piece at a time.
- **Delightful feedback.** Each accepted part fires confetti, **+XP**, a level
  bar, and a quest‑map stepper — learning that feels like leveling up.
- **Keep it.** Download the `.html`, ask for free‑form changes at the end, or open
  the prompt in an external builder. Finish with the single transferable lesson.

The build target is deliberately a single self‑contained file (inline CSS +
vanilla JS, **no external dependencies**): instant, safe (the iframe runs with
`allow-scripts` only), portable, and genuinely *yours*.

---

## Configuration

All optional — see [`.env.example`](./.env.example).

| Variable                  | Default            | Purpose                                                        |
| ------------------------- | ------------------ | -------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`       | _(unset → demo)_   | Enables the real Claude advisor, scoring, and lesson.          |
| `WHETSTONE_DEMO`          | _(unset)_          | `1` forces demo mode even with a key.                          |
| `WHETSTONE_ADVISOR_MODEL` | `claude-sonnet-4-6`| Fast, responsive model for the live conversation (try `claude-haiku-4-5`). |
| `WHETSTONE_SCORING_MODEL` | `claude-opus-4-8`  | Deliberate model for scoring + prompt synthesis (runs each turn). |
| `WHETSTONE_LESSON_MODEL`  | `claude-opus-4-8`  | Deliberate model for the one-shot closing lesson.              |
| `WHETSTONE_BUILDER_MODEL` | `claude-opus-4-8`  | Model that generates the app code — Opus 4.8 for top code quality. |
| `WHETSTONE_COACH_MODEL`   | `claude-opus-4-8`  | Coach Spark — the build plan and per‑step teaching.            |
| `WHETSTONE_THRESHOLD`     | `80`               | Overall score (1–100) needed to auto‑export.                   |
| `WHETSTONE_BUILDER`       | `bolt`             | Connected builder: `bolt` · `v0` · `lovable` · `claude`.       |
| `BUILDER_WEBHOOK_URL`     | _(unset)_          | Server‑to‑server hand‑off: the refined prompt is POSTed here.  |

---

## Architecture

Next.js (App Router) + TypeScript + Tailwind CSS v4, talking to Claude through the
official Anthropic SDK with prompt caching and structured outputs.

```
app/
  page.tsx              # resolves demo/threshold/builder from env → <WhetstoneApp/>
  layout.tsx            # fonts + metadata
  globals.css           # Tailwind v4 theme (the "forge" palette)
  api/
    advisor/route.ts    # streamed CEO‑advisor reply (adaptive thinking)
    score/route.ts      # structured assessment (json_schema output)
    lesson/route.ts     # structured transferable lesson
    export/route.ts     # builder deep link + optional webhook hand‑off
    build/route.ts      # streams the generated self‑contained app (first build)
    edit/route.ts       # targeted find‑and‑replace edits for fast iteration
    coach/route.ts      # structured teaching card after each build step
components/             # WhetstoneApp orchestrator, Composer, Conversation,
                        # ScorePanel/Ring/DimensionBar, ExportCard, LessonCard,
                        # BuildWorkspace (preview + code + coach rail)…
hooks/                 # useSpeechRecognition (voice in) · useSpeechSynthesis (voice out)
lib/                   # prompts, scoring (threshold logic), builders, demo, types…
```

**Claude usage — two models by design.** A fast, responsive model
(**Sonnet 4.6**) streams the advisor to keep the conversation flowing; a more
deliberate model (**Opus 4.8**) handles scoring and the lesson, where judgment
matters. The two run in parallel each turn, so scoring never blocks the chat.
Scoring and the lesson use **structured outputs** (`output_config.format` with a
JSON schema) so results are always valid; system prompts are cached. Adaptive
thinking and `effort` are applied only on models that support them (Opus 4.5+ /
Sonnet 4.6), so swapping in a faster model like Haiku 4.5 stays valid.

**Multimodal.** Voice in/out uses the browser Web Speech API (no extra keys;
gracefully hidden where unsupported). Images you share are sent to Claude's vision
so the advisor can react to what it actually sees in your sketch or mockup.

**The connected builder.** Export always yields a deep link that prefills the
builder with your refined prompt; the one‑click "Open in …" hand‑off launches it
reliably (browsers block silent pop‑ups). Set `BUILDER_WEBHOOK_URL` for a true
hands‑free, server‑to‑server export into your own pipeline. Deep‑link query params
are best‑effort per builder; the prompt is also copied to your clipboard as a
fallback.

---

## Notes

- **Voice** requires a browser with the Web Speech API (Chrome/Edge are best).
  Where it's missing, the mic/voice controls simply don't appear.
- **Demo mode** is deterministic and offline‑friendly — scores climb as you give
  more substantive answers, so a handful of sharp turns will cross the bar.
- This repo includes a `SessionStart` hook (`.claude/settings.json`) that installs
  dependencies automatically in Claude Code web sessions.
