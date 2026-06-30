import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in code fences", () => {
    expect(safeParseJson<{ a: number }>("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("parses JSON preceded by prose", () => {
    expect(safeParseJson<{ x: string }>("Here's the result:\n{\"x\":\"y\"}")).toEqual({ x: "y" });
  });

  it("parses JSON with trailing prose", () => {
    expect(safeParseJson<{ x: string }>("{\"x\":\"y\"} done")).toEqual({ x: "y" });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the error message for a plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns a fallback string for non-Error throws", () => {
    expect(getErrorMessage("raw string")).toContain("went wrong");
  });

  it("returns a fallback for null", () => {
    expect(getErrorMessage(null)).toContain("went wrong");
  });
});
