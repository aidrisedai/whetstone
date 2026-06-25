import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson } from "../lib/serverUtils";

// ── getErrorMessage ────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("returns the error message for a standard Error", () => {
    const err = new Error("something broke");
    expect(getErrorMessage(err)).toBe("something broke");
  });

  it("returns a fallback string for non-Error values", () => {
    expect(getErrorMessage("oops")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(undefined)).toBe("Something went wrong reaching the advisor.");
  });
});

// ── safeParseJson ──────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const result = safeParseJson<{ x: number }>('{"x":1}');
    expect(result).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in json code fences", () => {
    const fenced = '```json\n{"x":2}\n```';
    const result = safeParseJson<{ x: number }>(fenced);
    expect(result).toEqual({ x: 2 });
  });

  it("parses JSON wrapped in plain code fences", () => {
    const fenced = '```\n{"x":3}\n```';
    const result = safeParseJson<{ x: number }>(fenced);
    expect(result).toEqual({ x: 3 });
  });

  it("extracts JSON from surrounding prose", () => {
    const text = 'Here is the result: {"x":4} enjoy!';
    const result = safeParseJson<{ x: number }>(text);
    expect(result).toEqual({ x: 4 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});
