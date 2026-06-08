import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "../lib/serverUtils";

// ── getErrorMessage ────────────────────────────────────────────────────────
describe("getErrorMessage", () => {
  it("returns message from a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback for non-Error unknown values", () => {
    expect(getErrorMessage("string error")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(undefined)).toBe("Something went wrong reaching the advisor.");
  });

  it("handles an object thrown as an error", () => {
    expect(getErrorMessage({ code: "ENOENT" })).toBe("Something went wrong reaching the advisor.");
  });
});

// ── safeParseJson ──────────────────────────────────────────────────────────
describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips backtick JSON fences", () => {
    const fenced = "```json\n{\"hello\":\"world\"}\n```";
    expect(safeParseJson<{ hello: string }>(fenced)).toEqual({ hello: "world" });
  });

  it("strips plain backtick fences (no language hint)", () => {
    const fenced = "```\n{\"a\":2}\n```";
    expect(safeParseJson<{ a: number }>(fenced)).toEqual({ a: 2 });
  });

  it("finds JSON embedded in prose", () => {
    const prose = 'Here is the result: {"score":99} — done.';
    expect(safeParseJson<{ score: number }>(prose)).toEqual({ score: 99 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested objects", () => {
    const json = '{"a":{"b":{"c":3}}}';
    expect(safeParseJson<{ a: { b: { c: number } } }>(json)).toEqual({ a: { b: { c: 3 } } });
  });
});

// ── jsonError ──────────────────────────────────────────────────────────────
describe("jsonError", () => {
  it("returns a Response with the given status", async () => {
    const res = jsonError("bad input", 400);
    expect(res.status).toBe(400);
  });

  it("defaults to 400 when status is omitted", async () => {
    const res = jsonError("oops");
    expect(res.status).toBe(400);
  });

  it("has application/json content-type", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("body contains the error message", async () => {
    const res = jsonError("something failed", 500);
    const body = await res.json();
    expect(body).toEqual({ error: "something failed" });
  });
});
