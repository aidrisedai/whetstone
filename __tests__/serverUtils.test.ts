import { describe, it, expect } from "vitest";
import { safeParseJson } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ score: number }>('{"score":85}');
    expect(result.score).toBe(85);
  });

  it("strips markdown json code fences", () => {
    const fenced = '```json\n{"score":85}\n```';
    expect(safeParseJson<{ score: number }>(fenced).score).toBe(85);
  });

  it("strips generic code fences", () => {
    const fenced = '```\n{"score":85}\n```';
    expect(safeParseJson<{ score: number }>(fenced).score).toBe(85);
  });

  it("extracts the JSON object from surrounding prose", () => {
    const prose = 'Sure! Here is the result:\n{"score":85}\nLet me know.';
    expect(safeParseJson<{ score: number }>(prose).score).toBe(85);
  });

  it("handles nested objects", () => {
    const json = '{"clarity":{"score":80,"rationale":"good","suggestion":"be sharper"}}';
    const result = safeParseJson<{ clarity: { score: number } }>(json);
    expect(result.clarity.score).toBe(80);
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});
