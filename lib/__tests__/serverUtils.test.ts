import { describe, expect, it } from "vitest";
import { safeParseJson } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json fences", () => {
    expect(safeParseJson<{ x: string }>('```json\n{"x":"y"}\n```')).toEqual({ x: "y" });
  });

  it("strips plain ``` fences", () => {
    expect(safeParseJson<{ x: string }>('```\n{"x":"y"}\n```')).toEqual({ x: "y" });
  });

  it("extracts JSON embedded in prose", () => {
    const text = 'Here is the result: {"score":42} done.';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 42 });
  });

  it("handles leading/trailing whitespace", () => {
    expect(safeParseJson<{ n: number }>('  \n{"n":7}\n  ')).toEqual({ n: 7 });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });
});
