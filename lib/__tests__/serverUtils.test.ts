import { describe, it, expect } from "vitest";
import { safeParseJson } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json code fences", () => {
    expect(safeParseJson<{ x: string }>('```json\n{"x":"y"}\n```')).toEqual({ x: "y" });
  });

  it("strips plain ``` code fences", () => {
    expect(safeParseJson<{ n: number }>('```\n{"n":42}\n```')).toEqual({ n: 42 });
  });

  it("extracts JSON when surrounded by prose", () => {
    expect(safeParseJson<{ ok: boolean }>('Here is the result: {"ok":true} done.')).toEqual({ ok: true });
  });

  it("handles nested objects", () => {
    const input = '{"a":{"b":2}}';
    expect(safeParseJson<{ a: { b: number } }>(input)).toEqual({ a: { b: 2 } });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson<unknown>("not json at all")).toThrow();
  });
});
