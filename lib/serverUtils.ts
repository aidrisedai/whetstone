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
 *
 * Strategy: try the candidate directly first; if that fails, scan for the
 * outermost { } pair by walking the string (handles nested braces and braces
 * inside string values, which lastIndexOf would get wrong).
 */
export function safeParseJson<T>(text: string): T {
  const trimmed = (text ?? "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();

  // Fast path: candidate is already valid JSON.
  try {
    return JSON.parse(candidate) as T;
  } catch {
    /* fall through to extraction */
  }

  // Walk the string to find the outermost { } correctly, skipping over string
  // literals so a } inside a value doesn't fool us.
  const start = candidate.indexOf("{");
  if (start < 0) return JSON.parse(candidate) as T; // will throw with a clear message
  let depth = 0;
  let inStr = false;
  let escape = false;
  let end = -1;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inStr) { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  const slice = end >= 0 ? candidate.slice(start, end + 1) : candidate.slice(start);
  return JSON.parse(slice) as T;
}

export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
