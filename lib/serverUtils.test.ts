import { describe, it, expect } from "vitest";
import { safeParseJson } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips json code fences", () => {
    expect(safeParseJson<{ x: string }>("```json\n{\"x\":\"y\"}\n```")).toEqual({ x: "y" });
  });

  it("strips generic code fences", () => {
    expect(safeParseJson<{ v: number }>("```\n{\"v\":42}\n```")).toEqual({ v: 42 });
  });

  it("extracts JSON embedded in prose", () => {
    const text = 'Here is the result: {"score":95} — done.';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 95 });
  });

  it("handles nested objects", () => {
    const json = '{"a":{"b":{"c":3}}}';
    expect(safeParseJson<{ a: { b: { c: number } } }>(json)).toEqual({ a: { b: { c: 3 } } });
  });

  it("throws on truly invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});
