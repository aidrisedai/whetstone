import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "../lib/serverUtils";
import Anthropic from "@anthropic-ai/sdk";

describe("safeParseJson", () => {
  it("parses a plain JSON object", () => {
    const result = safeParseJson<{ a: number }>('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a code fence", () => {
    const result = safeParseJson<{ x: string }>('```json\n{"x": "hello"}\n```');
    expect(result).toEqual({ x: "hello" });
  });

  it("parses JSON wrapped in a plain code fence", () => {
    const result = safeParseJson<{ n: number }>('```\n{"n": 42}\n```');
    expect(result).toEqual({ n: 42 });
  });

  it("extracts JSON embedded in surrounding prose", () => {
    const result = safeParseJson<{ ok: boolean }>('Here is the result: {"ok": true} that\'s all.');
    expect(result).toEqual({ ok: true });
  });

  it("throws on completely malformed input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => safeParseJson("")).toThrow();
  });

  it("handles nested JSON correctly", () => {
    const result = safeParseJson<{ a: { b: number } }>('{"a": {"b": 7}}');
    expect(result.a.b).toBe(7);
  });
});

describe("getErrorMessage", () => {
  it("returns auth error message for AuthenticationError", () => {
    const err = new Anthropic.AuthenticationError(401, {} as Response, "auth failed", new Headers());
    expect(getErrorMessage(err)).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("returns rate limit message for RateLimitError", () => {
    const err = new Anthropic.RateLimitError(429, {} as Response, "rate limited", new Headers());
    expect(getErrorMessage(err)).toMatch(/rate-limited/);
  });

  it("returns generic API error message for APIError", () => {
    const err = new Anthropic.APIError(503, {} as Response, "service unavailable", new Headers());
    expect(getErrorMessage(err)).toMatch(/503/);
  });

  it("returns message for plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns fallback for non-Error values", () => {
    expect(getErrorMessage("string error")).toMatch(/Something went wrong/);
    expect(getErrorMessage(null)).toMatch(/Something went wrong/);
  });
});
