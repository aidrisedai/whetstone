import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson } from "@/lib/serverUtils";

describe("getErrorMessage", () => {
  it("returns err.message for a plain Error", () => {
    expect(getErrorMessage(new Error("something broke"))).toBe("something broke");
  });

  it("returns the fallback string for unknown non-Error values", () => {
    expect(getErrorMessage("a string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips ```json … ``` code fences", () => {
    const text = "```json\n{\"x\":2}\n```";
    expect(safeParseJson<{ x: number }>(text)).toEqual({ x: 2 });
  });

  it("strips plain ``` code fences", () => {
    const text = "```\n{\"x\":3}\n```";
    expect(safeParseJson<{ x: number }>(text)).toEqual({ x: 3 });
  });

  it("extracts JSON from surrounding prose", () => {
    const text = 'Here is your answer: {"x":4} — that\'s it.';
    expect(safeParseJson<{ x: number }>(text)).toEqual({ x: 4 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });

  it("handles empty string gracefully by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});
