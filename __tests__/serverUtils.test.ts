import { describe, it, expect } from "vitest";
import { safeParseJson } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ ok: boolean }>('{"ok":true}')).toEqual({ ok: true });
  });

  it("parses JSON wrapped in ```json fences", () => {
    const input = "```json\n{\"score\":80}\n```";
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 80 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const input = "```\n{\"score\":80}\n```";
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 80 });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is the result: {"value":42} — done.';
    expect(safeParseJson<{ value: number }>(input)).toEqual({ value: 42 });
  });

  it("handles leading/trailing whitespace", () => {
    expect(safeParseJson<{ x: number }>('   {"x":1}   ')).toEqual({ x: 1 });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested objects", () => {
    const obj = { a: { b: { c: 3 } } };
    expect(safeParseJson(JSON.stringify(obj))).toEqual(obj);
  });
});
