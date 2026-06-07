import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ score: number }>('{"score": 85}');
    expect(result.score).toBe(85);
  });

  it("strips markdown code fences before parsing", () => {
    const result = safeParseJson<{ ok: boolean }>("```json\n{\"ok\": true}\n```");
    expect(result.ok).toBe(true);
  });

  it("strips plain code fences", () => {
    const result = safeParseJson<{ x: number }>("```\n{\"x\": 42}\n```");
    expect(result.x).toBe(42);
  });

  it("extracts JSON object from surrounding prose", () => {
    const result = safeParseJson<{ val: string }>(
      'Here is the result: {"val": "hello"} and some trailing text.',
    );
    expect(result.val).toBe("hello");
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested objects", () => {
    const result = safeParseJson<{ a: { b: number } }>('{"a": {"b": 7}}');
    expect(result.a.b).toBe(7);
  });
});

describe("getErrorMessage", () => {
  it("returns message from a standard Error", () => {
    const err = new Error("something broke");
    expect(getErrorMessage(err)).toBe("something broke");
  });

  it("returns fallback for unknown error types", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage({})).toBe("Something went wrong reaching the advisor.");
  });
});
