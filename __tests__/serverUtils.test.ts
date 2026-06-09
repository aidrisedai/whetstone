import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "@/lib/serverUtils";
import Anthropic from "@anthropic-ai/sdk";

// ── safeParseJson ─────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ score: number }>('{"score":80}');
    expect(result).toEqual({ score: 80 });
  });

  it("parses JSON wrapped in ```json ... ``` fences", () => {
    const result = safeParseJson<{ score: number }>("```json\n{\"score\":80}\n```");
    expect(result).toEqual({ score: 80 });
  });

  it("parses JSON wrapped in ``` ... ``` fences (no language)", () => {
    const result = safeParseJson<{ score: number }>('```\n{"score":80}\n```');
    expect(result).toEqual({ score: 80 });
  });

  it("extracts JSON object from surrounding prose", () => {
    const result = safeParseJson<{ score: number }>('Here is the result: {"score":80} Hope that helps!');
    expect(result).toEqual({ score: 80 });
  });

  it("handles null/undefined input gracefully", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

// ── getErrorMessage ───────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("returns a friendly message for AuthenticationError", () => {
    const err = new Anthropic.AuthenticationError(401, { error: { type: "authentication_error", message: "" } } as never, "", new Headers());
    expect(getErrorMessage(err)).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("returns a friendly message for RateLimitError", () => {
    const err = new Anthropic.RateLimitError(429, { error: { type: "rate_limit_error", message: "" } } as never, "", new Headers());
    expect(getErrorMessage(err)).toMatch(/rate-limited/);
  });

  it("returns message for a generic Error", () => {
    const err = new Error("something exploded");
    expect(getErrorMessage(err)).toBe("something exploded");
  });

  it("returns fallback for unknown thrown values", () => {
    expect(getErrorMessage("some string")).toMatch(/Something went wrong/);
    expect(getErrorMessage(42)).toMatch(/Something went wrong/);
    expect(getErrorMessage(null)).toMatch(/Something went wrong/);
  });
});
