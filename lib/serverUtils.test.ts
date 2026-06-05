import { describe, it, expect } from "vitest";
import { safeParseJson } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const input = '```json\n{"a":1}\n```';
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("parses JSON with surrounding prose", () => {
    const input = 'Here is the result:\n{"a":1}\nThat\'s it!';
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("throws for non-JSON input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});
