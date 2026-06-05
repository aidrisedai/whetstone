import { describe, it, expect } from "vitest";
import { safeParseJson } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json code fences", () => {
    const input = '```json\n{"x":42}\n```';
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 42 });
  });

  it("strips plain code fences", () => {
    const input = "```\n{\"y\":99}\n```";
    expect(safeParseJson<{ y: number }>(input)).toEqual({ y: 99 });
  });

  it("extracts JSON object from surrounding prose", () => {
    const input = 'Here is the result: {"score":75} — hope that helps!';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 75 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });

  it("handles null/undefined input gracefully (falls through to throw)", () => {
    // @ts-expect-error intentional bad input
    expect(() => safeParseJson(null)).toThrow();
  });
});
