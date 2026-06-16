import Anthropic from "@anthropic-ai/sdk";

/**
 * Whetstone talks to Claude through three jobs. They split across two models by
 * design: a fast, responsive model keeps the *conversation* flowing, while a
 * more deliberate model handles the *judgment* work (scoring and the lesson).
 * Each is overridable via env so an operator can re-tune the speed/depth/cost
 * trade-off without touching code.
 */
export const MODELS = {
  // Fast + responsive, but still sharp — drives the live dialogue.
  advisor: process.env.WHETSTONE_ADVISOR_MODEL || "claude-sonnet-4-6",
  // Deliberate judgment — picks criteria, grades honestly, writes the prompt.
  scoring: process.env.WHETSTONE_SCORING_MODEL || "claude-opus-4-8",
  // One-shot at the end — quality over speed.
  lesson: process.env.WHETSTONE_LESSON_MODEL || "claude-opus-4-8",
  // The builder — Opus 4.8 for the strongest, highest-quality code generation.
  builder: process.env.WHETSTONE_BUILDER_MODEL || "claude-opus-4-8",
  // The build coach + whiteboard teacher — deliberate teaching.
  coach: process.env.WHETSTONE_COACH_MODEL || "claude-opus-4-8",
} as const;

export type Effort = "low" | "medium" | "high";

interface Reasoning {
  thinking?: { type: "adaptive" };
  output_config?: { effort: Effort };
}

/**
 * Adaptive thinking and the `effort` parameter are supported on Opus 4.5+ and
 * Sonnet 4.6, but ERROR on Sonnet 4.5 / Haiku 4.5. So derive the reasoning
 * config from the model: capable models get adaptive thinking + effort; faster
 * models (e.g. Haiku) run lean with neither, which keeps any model swap valid.
 */
export function reasoning(model: string, effort: Effort): Reasoning {
  return supportsAdaptiveEffort(model)
    ? { thinking: { type: "adaptive" }, output_config: { effort } }
    : {};
}

function supportsAdaptiveEffort(model: string): boolean {
  // Sonnet 4.5 and Haiku 4.5 are known to error on adaptive thinking + effort; exclude them explicitly.
  if (/^claude-(sonnet|haiku)-4-5\b/.test(model)) return false;
  return /^claude-opus-4-\d+\b/.test(model) || /^claude-sonnet-4-([6-9]|\d{2,})\b/.test(model);
}

/**
 * Demo mode lets the whole experience run with zero configuration: if there is
 * no API key, Whetstone serves deterministic stand-in advisor replies, scores,
 * and lessons so the flow is fully explorable. Set WHETSTONE_DEMO=1 to force it
 * even when a key is present (useful for offline UI work).
 */
export function isDemoMode(): boolean {
  if (process.env.WHETSTONE_DEMO === "1") return true;
  return !process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;

/** Lazily construct the SDK client (reads ANTHROPIC_API_KEY from the environment). */
export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}
