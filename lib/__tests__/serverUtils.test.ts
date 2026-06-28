import { describe, it, expect } from "vitest";
import { safeParseJson } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips markdown code fences", () => {
    expect(safeParseJson<{ x: number }>('```json\n{"x":2}\n```')).toEqual({ x: 2 });
  });

  it("strips plain ``` fences", () => {
    expect(safeParseJson<{ x: number }>('```\n{"x":3}\n```')).toEqual({ x: 3 });
  });

  it("extracts JSON from surrounding prose", () => {
    expect(safeParseJson<{ ok: boolean }>('Here is your JSON: {"ok":true} done.')).toEqual({ ok: true });
  });

  it("throws on truly malformed JSON", () => {
    expect(() => safeParseJson("{not json}")).toThrow();
  });
});
