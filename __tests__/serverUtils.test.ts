import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "../lib/serverUtils";

// ── safeParseJson ─────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses a plain JSON string", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips a markdown JSON code fence", () => {
    const input = "```json\n{\"x\": 42}\n```";
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 42 });
  });

  it("strips a generic code fence (no language tag)", () => {
    const input = "```\n{\"y\": true}\n```";
    expect(safeParseJson<{ y: boolean }>(input)).toEqual({ y: true });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is your result: {"score": 80} — done.';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 80 });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested objects", () => {
    const obj = { a: { b: { c: 3 } } };
    expect(safeParseJson(JSON.stringify(obj))).toEqual(obj);
  });
});

// ── jsonError ────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad request" });
  });

  it("respects a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "not found" });
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("test");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

// ── getErrorMessage ──────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("returns the message from a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the fallback for non-Error unknowns", () => {
    expect(getErrorMessage("just a string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
