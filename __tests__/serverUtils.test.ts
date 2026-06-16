import { describe, expect, it } from "vitest";
import { safeParseJson } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json ... ``` fences", () => {
    const fenced = "```json\n{\"x\": 42}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 42 });
  });

  it("strips plain ``` ... ``` fences", () => {
    expect(safeParseJson<{ v: string }>('```\n{"v":"hi"}\n```')).toEqual({ v: "hi" });
  });

  it("extracts JSON buried in prose", () => {
    const prose = 'Here is the result: {"score": 72} — let me know if you need more.';
    expect(safeParseJson<{ score: number }>(prose)).toEqual({ score: 72 });
  });

  it("handles nested objects", () => {
    const raw = '{"a":{"b":{"c":3}}}';
    expect(safeParseJson<{ a: { b: { c: number } } }>(raw)).toEqual({ a: { b: { c: 3 } } });
  });

  it("throws SyntaxError on unparseable content", () => {
    expect(() => safeParseJson("not json at all")).toThrow(SyntaxError);
  });
});
