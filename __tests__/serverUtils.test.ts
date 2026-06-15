import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("strips ```json ... ``` code fences", () => {
    const fenced = "```json\n{\"x\": 42}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 42 });
  });

  it("strips plain ``` ... ``` code fences", () => {
    const fenced = "```\n{\"y\": true}\n```";
    expect(safeParseJson<{ y: boolean }>(fenced)).toEqual({ y: true });
  });

  it("finds JSON embedded in prose", () => {
    const prose = 'Here is the result: {"score": 95} end.';
    expect(safeParseJson<{ score: number }>(prose)).toEqual({ score: 95 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested objects", () => {
    const json = '{"a": {"b": [1, 2, 3]}}';
    expect(safeParseJson<{ a: { b: number[] } }>(json)).toEqual({ a: { b: [1, 2, 3] } });
  });
});

describe("getErrorMessage", () => {
  it("returns message for a plain Error", () => {
    const err = new Error("something broke");
    expect(getErrorMessage(err)).toBe("something broke");
  });

  it("returns fallback for unknown error types", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(undefined)).toBe("Something went wrong reaching the advisor.");
  });

  it("returns fallback for plain objects without message", () => {
    expect(getErrorMessage({ code: "ERR" })).toBe("Something went wrong reaching the advisor.");
  });
});
