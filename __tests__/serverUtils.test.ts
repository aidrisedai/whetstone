import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    expect(safeParseJson<{ x: string }>("```json\n{\"x\":\"y\"}\n```")).toEqual({ x: "y" });
    expect(safeParseJson<{ x: string }>("```\n{\"x\":\"y\"}\n```")).toEqual({ x: "y" });
  });

  it("extracts object from surrounding prose", () => {
    expect(safeParseJson<{ n: number }>("Here is the result: {\"n\":42} done.")).toEqual({ n: 42 });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns message from Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback for unknown errors", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});
