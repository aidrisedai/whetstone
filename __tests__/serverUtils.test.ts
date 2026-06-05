import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "@/lib/serverUtils";

// ── safeParseJson ─────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips json code fences", () => {
    const wrapped = "```json\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(wrapped)).toEqual({ a: 1 });
  });

  it("strips plain code fences", () => {
    const wrapped = "```\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(wrapped)).toEqual({ a: 1 });
  });

  it("extracts JSON from surrounding prose", () => {
    const messy = 'Here is the result: {"score":90} That is the score.';
    expect(safeParseJson<{ score: number }>(messy)).toEqual({ score: 90 });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

// ── getErrorMessage ───────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("returns message from a plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns fallback string for unknown error types", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });

  it("returns fallback for empty string thrown", () => {
    expect(getErrorMessage("")).toBe("Something went wrong reaching the advisor.");
  });
});

// ── jsonError ─────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a 400 response with the error message by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("respects a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });

  it("uses 502 for upstream errors", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("upstream failed");
  });
});
