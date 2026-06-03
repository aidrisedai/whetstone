import { describe, it, expect } from "vitest";
import { safeParseJson } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips markdown code fences", () => {
    const input = '```json\n{"x":2}\n```';
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 2 });
  });

  it("strips code fences without language tag", () => {
    const input = '```\n{"x":3}\n```';
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 3 });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is the result: {"score":90} — hope that helps!';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 90 });
  });

  it("handles nested objects", () => {
    const input = '{"a":{"b":{"c":42}}}';
    expect(safeParseJson<{ a: { b: { c: number } } }>(input)).toEqual({
      a: { b: { c: 42 } },
    });
  });

  it("throws for completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});
