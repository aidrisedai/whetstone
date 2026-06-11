import { describe, it, expect } from "vitest";
import { safeParseJson } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a code fence", () => {
    const text = '```json\n{"a":1}\n```';
    expect(safeParseJson<{ a: number }>(text)).toEqual({ a: 1 });
  });

  it("parses JSON inside a plain code fence", () => {
    const text = "```\n{\"b\":2}\n```";
    expect(safeParseJson<{ b: number }>(text)).toEqual({ b: 2 });
  });

  it("extracts JSON from surrounding prose", () => {
    const text = 'Here is the result: {"score":75} enjoy!';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 75 });
  });

  it("throws for completely unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles empty string gracefully (throws)", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});
