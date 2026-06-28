import Anthropic from "@anthropic-ai/sdk";

/** Turn an unknown error into a short, builder-friendly message. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "The advisor can't authenticate — check that ANTHROPIC_API_KEY is set correctly.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "The advisor is rate-limited right now. Give it a few seconds and try again.";
  }
  if (err instanceof Anthropic.APIError) {
    return `The advisor hit an API error (${err.status ?? "?"}). Try again in a moment.`;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong reaching the advisor.";
}

/**
 * Parse JSON that may be wrapped in code fences or surrounded by stray prose.
 * Structured outputs return clean JSON, but this keeps the path robust.
 */
export function safeParseJson<T>(text: string): T {
  const trimmed = (text ?? "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const slice = start >= 0 && end >= start ? candidate.slice(start, end + 1) : candidate;
  return JSON.parse(slice) as T;
}

export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const MAX_HISTORY = 60;
const MAX_MESSAGE_CHARS = 12_000;
const MAX_PROMPT_CHARS = 6_000;
const MAX_CONCEPTS = 60;

/**
 * Validate the most common request fields so malformed or oversized payloads
 * are rejected before they reach the model. Returns an error Response on
 * failure, or null when everything looks fine.
 */
export function validateRequest({
  history,
  refinedPrompt,
  knownConcepts,
}: {
  history?: unknown;
  refinedPrompt?: unknown;
  knownConcepts?: unknown;
}): Response | null {
  if (history !== undefined) {
    if (!Array.isArray(history)) return jsonError("`history` must be an array");
    if (history.length > MAX_HISTORY)
      return jsonError(`\`history\` exceeds max length of ${MAX_HISTORY} messages`);
    for (const m of history) {
      if (typeof m?.content === "string" && m.content.length > MAX_MESSAGE_CHARS) {
        return jsonError(`A message exceeds max length of ${MAX_MESSAGE_CHARS} characters`);
      }
    }
  }
  if (refinedPrompt !== undefined) {
    if (typeof refinedPrompt !== "string")
      return jsonError("`refinedPrompt` must be a string");
    if (refinedPrompt.length > MAX_PROMPT_CHARS)
      return jsonError(`\`refinedPrompt\` exceeds max length of ${MAX_PROMPT_CHARS} characters`);
  }
  if (knownConcepts !== undefined) {
    if (!Array.isArray(knownConcepts))
      return jsonError("`knownConcepts` must be an array");
    if (knownConcepts.length > MAX_CONCEPTS)
      return jsonError(`\`knownConcepts\` exceeds max length of ${MAX_CONCEPTS} items`);
  }
  return null;
}
