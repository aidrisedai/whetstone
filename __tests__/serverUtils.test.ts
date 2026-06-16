import { describe, it, expect } from "vitest";
import { safeParseJson } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json code fences", () => {
    const input = '```json\n{"x":"y"}\n```';
    expect(safeParseJson<{ x: string }>(input)).toEqual({ x: "y" });
  });

  it("strips plain ``` code fences", () => {
    const input = '```\n{"x":"y"}\n```';
    expect(safeParseJson<{ x: string }>(input)).toEqual({ x: "y" });
  });

  it("extracts JSON embedded in prose", () => {
    const input = 'Here is the result: {"score":42} — done.';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 42 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });
});
