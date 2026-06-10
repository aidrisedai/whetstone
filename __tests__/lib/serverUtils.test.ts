import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in triple-backtick fences", () => {
    expect(safeParseJson<{ x: string }>("```json\n{\"x\":\"hello\"}\n```")).toEqual({ x: "hello" });
  });

  it("parses JSON wrapped in plain fences (no language tag)", () => {
    expect(safeParseJson<{ n: number }>("```\n{\"n\":42}\n```")).toEqual({ n: 42 });
  });

  it("ignores prose before and after JSON braces", () => {
    const input = 'Here is the result: {"ok":true} — enjoy.';
    expect(safeParseJson<{ ok: boolean }>(input)).toEqual({ ok: true });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the message from a plain Error", () => {
    const err = new Error("something went wrong");
    expect(getErrorMessage(err)).toBe("something went wrong");
  });

  it("returns fallback for non-Error values", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(undefined)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("jsonError", () => {
  it("returns a 400 Response with JSON error body by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("uses the provided status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });
});
