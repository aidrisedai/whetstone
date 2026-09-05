import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, CriterionSpec, ImageAttachment, Role } from "./types";

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

/* ── Request-body coercion ────────────────────────────────────────────────
 * A JSON body is whatever the caller sent — `"projectType": 42` is valid JSON
 * but not a string. Reading these fields with `(body.x ?? "").trim()` throws a
 * TypeError that escapes the route and becomes an empty 500, so the builder
 * sees a dead screen with no message. These coercers keep every field on its
 * declared type and let the route answer with a real 400 instead.
 */

/** Parse the request body, returning null unless it's a JSON object. */
export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** A string field, verbatim — anything that isn't a string becomes `fallback`. */
export function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** A string field, trimmed — anything that isn't a string becomes `fallback`. */
export function asTrimmed(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

/** A finite number field — NaN, Infinity, and non-numbers become `fallback`. */
export function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** A list of strings; non-arrays yield `[]`, non-string entries are dropped. */
export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function asImages(value: unknown): ImageAttachment[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const images = value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const img = raw as Record<string, unknown>;
    if (typeof img.mediaType !== "string" || typeof img.data !== "string") return [];
    const out: ImageAttachment = { mediaType: img.mediaType, data: img.data };
    if (typeof img.name === "string") out.name = img.name;
    return [out];
  });
  return images.length > 0 ? images : undefined;
}

/**
 * A chat history. Malformed entries are dropped rather than crashing the
 * conversion to Anthropic messages; returns null when nothing usable is left,
 * which routes report as a 400.
 */
export function asChatHistory(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value)) return null;
  const history = value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const m = raw as Record<string, unknown>;
    if (typeof m.content !== "string") return [];
    const role: Role = m.role === "advisor" ? "advisor" : "user";
    const msg: ChatMessage = {
      id: typeof m.id === "string" ? m.id : "",
      role,
      content: m.content,
    };
    const images = asImages(m.images);
    if (images) msg.images = images;
    return [msg];
  });
  return history.length > 0 ? history : null;
}

/** Previously-chosen scoring dimensions; null when absent or unusable. */
export function asCriteria(value: unknown): CriterionSpec[] | null {
  if (!Array.isArray(value)) return null;
  const specs = value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const c = raw as Record<string, unknown>;
    if (typeof c.key !== "string" || typeof c.label !== "string") return [];
    return [{ key: c.key, label: c.label, bestPractice: asText(c.bestPractice) }];
  });
  return specs.length > 0 ? specs : null;
}

/** One build part as the coach routes expect it; null when it isn't an object. */
export interface PartInput {
  title: string;
  whatItIs: string;
  concept: string;
  buildSpec: string;
}

export function asPart(value: unknown): PartInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  return {
    title: asTrimmed(p.title),
    whatItIs: asText(p.whatItIs),
    concept: asText(p.concept),
    buildSpec: asText(p.buildSpec),
  };
}
