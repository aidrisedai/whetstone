import { describe, it, expect } from "vitest";
import { safeParseJson } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips ```json code fences", () => {
    expect(safeParseJson<{ x: number }>('```json\n{"x":1}\n```')).toEqual({ x: 1 });
  });

  it("strips plain code fences", () => {
    expect(safeParseJson<{ a: string }>('```\n{"a":"hello"}\n```')).toEqual({ a: "hello" });
  });

  it("extracts JSON from surrounding prose", () => {
    expect(safeParseJson<{ x: number }>('Here is the result: {"x":1} done.')).toEqual({ x: 1 });
  });

  it("parses nested objects", () => {
    const input = '{"a":{"b":2}}';
    expect(safeParseJson<{ a: { b: number } }>(input)).toEqual({ a: { b: 2 } });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});
