import { describe, it, expect } from "vitest";
import { safeParseJson } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips markdown code fences", () => {
    const input = '```json\n{"x":1}\n```';
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 1 });
  });

  it("strips plain code fences", () => {
    const input = "```\n{\"x\":1}\n```";
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 1 });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is the result: {"x":1} as requested.';
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 1 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("{not json}")).toThrow();
  });

  it("handles nested objects", () => {
    const input = '{"a":{"b":{"c":3}}}';
    expect(safeParseJson<{ a: { b: { c: number } } }>(input)).toEqual({
      a: { b: { c: 3 } },
    });
  });
});
