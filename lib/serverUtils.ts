import Anthropic from "@anthropic-ai/sdk";

/** Maximum size for generated app code payloads (200 KB). */
export const MAX_CODE_BYTES = 200 * 1024;

/** Return a 413 error if `value` exceeds `max` bytes (encoded as UTF-8). */
export function sizeError(field: string, value: string, max = MAX_CODE_BYTES): Response | null {
  const bytes = new TextEncoder().encode(value).length;
  if (bytes > max) {
    return new Response(JSON.stringify({ error: `\`${field}\` exceeds the ${Math.round(max / 1024)}KB limit` }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

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
