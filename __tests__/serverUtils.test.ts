import { describe, it, expect } from "vitest";
import { safeParseJson } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips markdown code fences", () => {
    const wrapped = "```json\n{\"x\":1}\n```";
    expect(safeParseJson<{ x: number }>(wrapped)).toEqual({ x: 1 });
  });

  it("strips plain code fences", () => {
    const wrapped = "```\n{\"x\":1}\n```";
    expect(safeParseJson<{ x: number }>(wrapped)).toEqual({ x: 1 });
  });

  it("extracts JSON from surrounding prose", () => {
    const messy = 'Here is the result: {"x":1} done.';
    expect(safeParseJson<{ x: number }>(messy)).toEqual({ x: 1 });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});
