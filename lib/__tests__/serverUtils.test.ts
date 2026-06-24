import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    const input = "```json\n{\"x\": 42}\n```";
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 42 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const input = "```\n{\"y\": true}\n```";
    expect(safeParseJson<{ y: boolean }>(input)).toEqual({ y: true });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = `Here is the result: {"score": 80} — done.`;
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 80 });
  });

  it("throws on truly malformed JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles empty input by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the message of a plain Error", () => {
    const err = new Error("something broke");
    expect(getErrorMessage(err)).toBe("something broke");
  });

  it("returns a fallback string for non-Error unknowns", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage("oops")).toBe("Something went wrong reaching the advisor.");
  });
});
