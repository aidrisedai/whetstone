import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "@/lib/serverUtils";
import Anthropic from "@anthropic-ai/sdk";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ x: number }>('{"x": 42}');
    expect(result.x).toBe(42);
  });

  it("strips markdown code fences", () => {
    const result = safeParseJson<{ a: string }>("```json\n{\"a\": \"hello\"}\n```");
    expect(result.a).toBe("hello");
  });

  it("extracts JSON from prose-wrapped text", () => {
    const result = safeParseJson<{ n: number }>("Here is the result: {\"n\": 7} done.");
    expect(result.n).toBe(7);
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns message from a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback for non-Error unknowns", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });

  it("returns a user-friendly message for AuthenticationError", () => {
    const err = new Anthropic.AuthenticationError(401, undefined, "", new Headers());
    expect(getErrorMessage(err)).toContain("ANTHROPIC_API_KEY");
  });

  it("returns a user-friendly message for RateLimitError", () => {
    const err = new Anthropic.RateLimitError(429, undefined, "", new Headers());
    expect(getErrorMessage(err)).toContain("rate-limited");
  });
});

describe("jsonError", () => {
  it("returns a 400 JSON response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("uses the provided status code", async () => {
    const res = jsonError("upstream fail", 502);
    expect(res.status).toBe(502);
  });
});
