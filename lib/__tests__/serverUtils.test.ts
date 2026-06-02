import { describe, it, expect } from "vitest";
import { safeParseJson } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips json code fences", () => {
    const text = "```json\n{\"x\":2}\n```";
    expect(safeParseJson<{ x: number }>(text)).toEqual({ x: 2 });
  });

  it("strips plain code fences", () => {
    const text = "```\n{\"y\":3}\n```";
    expect(safeParseJson<{ y: number }>(text)).toEqual({ y: 3 });
  });

  it("handles surrounding prose by finding the first { and last }", () => {
    const text = 'Here is the JSON: {"z":4} — enjoy!';
    expect(safeParseJson<{ z: number }>(text)).toEqual({ z: 4 });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested objects", () => {
    const obj = { clarity: { score: 80, rationale: "good" } };
    expect(safeParseJson(JSON.stringify(obj))).toEqual(obj);
  });
});
