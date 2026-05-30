import Anthropic from "@anthropic-ai/sdk";

/**
 * Whetstone talks to Claude through three jobs — the conversational advisor,
 * the scoring engine, and the closing lesson. Each model is configurable so an
 * operator can trade quality for cost/latency without touching code.
 */
export const MODELS = {
  advisor: process.env.WHETSTONE_ADVISOR_MODEL || "claude-opus-4-8",
  scoring: process.env.WHETSTONE_SCORING_MODEL || "claude-opus-4-8",
  lesson: process.env.WHETSTONE_LESSON_MODEL || "claude-opus-4-8",
} as const;

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
