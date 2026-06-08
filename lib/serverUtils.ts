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
  try {
    return JSON.parse(slice) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse model JSON: ${err instanceof Error ? err.message : "unknown"} — got: ${slice.slice(0, 120)}`,
    );
  }
}

export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
