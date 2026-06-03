import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "../lib/serverUtils";

// ── safeParseJson ─────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    const fenced = "```json\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(fenced)).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ``` fences (no language tag)", () => {
    const fenced = "```\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(fenced)).toEqual({ a: 1 });
  });

  it("parses JSON with surrounding prose (extracts first { … })", () => {
    const text = "Here is the result: {\"a\":2} — done.";
    expect(safeParseJson<{ a: number }>(text)).toEqual({ a: 2 });
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested objects", () => {
    const result = safeParseJson<{ x: { y: string } }>('{"x":{"y":"z"}}');
    expect(result.x.y).toBe("z");
  });
});

// ── getErrorMessage ───────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("extracts message from a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback string for unknown non-Error values", () => {
    expect(getErrorMessage("oops")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});

// ── jsonError ─────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("creates a 400 response with the error message by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad request" });
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
