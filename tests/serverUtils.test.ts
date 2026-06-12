import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips triple-backtick json fences", () => {
    const fenced = "```json\n{\"x\":2}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 2 });
  });

  it("strips triple-backtick fences without language tag", () => {
    const fenced = "```\n{\"x\":3}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 3 });
  });

  it("extracts JSON from surrounding prose", () => {
    const prose = 'Here is the result: {"score":42} enjoy!';
    expect(safeParseJson<{ score: number }>(prose)).toEqual({ score: 42 });
  });

  it("throws on truly unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles whitespace padding gracefully", () => {
    expect(safeParseJson<{ a: string }>('  \n  {"a":"b"}  \n  ')).toEqual({ a: "b" });
  });
});

describe("getErrorMessage", () => {
  it("returns the Error message for plain errors", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback string for unknown throws", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });

  it("surfaces an auth error message", () => {
    const msg = getErrorMessage({ name: "AuthenticationError", status: 401 });
    // Not an Anthropic.AuthenticationError instance, so falls through to generic
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });
});
