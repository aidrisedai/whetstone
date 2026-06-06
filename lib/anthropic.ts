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
  // Parse major.minor and compare numerically so 4.9, 5.0, etc. are handled correctly.
  const opusMatch = model.match(/^claude-opus-(\d+)-(\d+)/);
  if (opusMatch) {
    const major = Number(opusMatch[1]);
    const minor = Number(opusMatch[2]);
    return major > 4 || (major === 4 && minor >= 5);
  }
  const sonnetMatch = model.match(/^claude-sonnet-(\d+)-(\d+)/);
  if (sonnetMatch) {
    const major = Number(sonnetMatch[1]);
    const minor = Number(sonnetMatch[2]);
    return major > 4 || (major === 4 && minor >= 6);
  }
  return false;
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
