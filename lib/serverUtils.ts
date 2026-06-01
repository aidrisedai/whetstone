import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "./types";

/** Max characters allowed in a single user message. */
const MAX_MSG_CHARS = 8_000;
/** Max total messages in a history payload. */
const MAX_HISTORY_LEN = 50;
/** Max characters for a prompt/code field. */
const MAX_PROMPT_CHARS = 4_000;
/** Max bytes for currentCode (the full generated HTML file). */
const MAX_CODE_BYTES = 200_000;

/** Returns a 400 response if the history array is oversized, otherwise null. */
export function guardHistory(history: ChatMessage[]): Response | null {
  if (history.length > MAX_HISTORY_LEN) {
    return jsonError(`history must not exceed ${MAX_HISTORY_LEN} messages`);
  }
  for (const m of history) {
    if (typeof m.content === "string" && m.content.length > MAX_MSG_CHARS) {
      return jsonError(`each message must not exceed ${MAX_MSG_CHARS} characters`);
    }
  }
  return null;
}

/** Returns a 400 response if `text` exceeds `max` characters, otherwise null. */
export function guardLength(
  field: string,
  text: string,
  max: number = MAX_PROMPT_CHARS,
): Response | null {
  if (text.length > max) {
    return jsonError(`\`${field}\` must not exceed ${max} characters`);
  }
  return null;
}

/** Returns a 400 response if `code` exceeds the code-size limit, otherwise null. */
export function guardCode(code: string): Response | null {
  if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
    return jsonError(`\`currentCode\` must not exceed ${MAX_CODE_BYTES / 1000}KB`);
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
