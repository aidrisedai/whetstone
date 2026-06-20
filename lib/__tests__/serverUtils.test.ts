import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "../serverUtils";
import Anthropic from "@anthropic-ai/sdk";

// ── safeParseJson ──────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips ```json ... ``` fences", () => {
    expect(safeParseJson<{ x: number }>('```json\n{"x":2}\n```')).toEqual({ x: 2 });
  });

  it("strips bare ``` fences", () => {
    expect(safeParseJson<{ x: number }>('```\n{"x":3}\n```')).toEqual({ x: 3 });
  });

  it("extracts JSON when surrounded by prose", () => {
    const text = 'Here is the result: {"score":42} — enjoy!';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 42 });
  });

  it("throws SyntaxError for unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow(SyntaxError);
  });

  it("handles nested objects", () => {
    const text = '{"a":{"b":{"c":true}}}';
    expect(safeParseJson<{ a: { b: { c: boolean } } }>(text)).toEqual({ a: { b: { c: true } } });
  });

  it("handles null/undefined input gracefully (treats as empty string then throws)", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

// ── jsonError ──────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a Response with the given status", async () => {
    const r = jsonError("oops", 400);
    expect(r.status).toBe(400);
  });

  it("defaults to status 400", async () => {
    const r = jsonError("oops");
    expect(r.status).toBe(400);
  });

  it("sets Content-Type to application/json", () => {
    const r = jsonError("msg");
    expect(r.headers.get("Content-Type")).toBe("application/json");
  });

  it("body contains the error message", async () => {
    const r = jsonError("bad input");
    const body = await r.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("accepts custom status codes", async () => {
    const r = jsonError("upstream broke", 502);
    expect(r.status).toBe(502);
    const body = await r.json();
    expect(body.error).toBe("upstream broke");
  });
});

// ── getErrorMessage ────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("returns message from a plain Error", () => {
    expect(getErrorMessage(new Error("plain error"))).toBe("plain error");
  });

  it("returns fallback string for non-Error", () => {
    expect(getErrorMessage("some string")).toBe("Something went wrong reaching the advisor.");
  });

  it("returns fallback string for null", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });

  it("handles AuthenticationError", () => {
    const msg = getErrorMessage(new Anthropic.AuthenticationError(401, undefined, "", new Headers()));
    expect(msg).toContain("ANTHROPIC_API_KEY");
  });

  it("handles RateLimitError", () => {
    const msg = getErrorMessage(new Anthropic.RateLimitError(429, undefined, "", new Headers()));
    expect(msg).toContain("rate-limited");
  });

  it("handles generic APIError", () => {
    const msg = getErrorMessage(new Anthropic.APIError(500, undefined, "", new Headers()));
    expect(msg).toContain("API error");
  });
});
