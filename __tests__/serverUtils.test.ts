import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "@/lib/serverUtils";
import Anthropic from "@anthropic-ai/sdk";

// ── safeParseJson ─────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const result = safeParseJson<{ score: number }>('{"score": 42}');
    expect(result.score).toBe(42);
  });

  it("parses JSON wrapped in a ```json fence", () => {
    const result = safeParseJson<{ ok: boolean }>("```json\n{\"ok\": true}\n```");
    expect(result.ok).toBe(true);
  });

  it("parses JSON wrapped in a plain ``` fence", () => {
    const result = safeParseJson<{ x: string }>("```\n{\"x\": \"hello\"}\n```");
    expect(result.x).toBe("hello");
  });

  it("extracts JSON when surrounded by prose", () => {
    const result = safeParseJson<{ n: number }>("Here is the result: {\"n\": 7} — done.");
    expect(result.n).toBe(7);
  });

  it("throws for completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

// ── getErrorMessage ───────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("handles a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a fallback string for unknown errors", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });

  it("mentions rate limiting for RateLimitError", () => {
    const err = new Anthropic.RateLimitError(429, undefined, "rate limit", new Headers());
    expect(getErrorMessage(err)).toMatch(/rate.limit/i);
  });

  it("mentions authentication for AuthenticationError", () => {
    const err = new Anthropic.AuthenticationError(401, undefined, "auth error", new Headers());
    expect(getErrorMessage(err)).toMatch(/authenticate/i);
  });
});

// ── jsonError ─────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a Response with the correct status", async () => {
    const res = jsonError("Something broke", 422);
    expect(res.status).toBe(422);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Something broke");
  });

  it("defaults to status 400", async () => {
    const res = jsonError("Bad input");
    expect(res.status).toBe(400);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
