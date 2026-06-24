import { describe, it, expect } from "vitest";
import { safeParseJson } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON objects", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences before parsing", () => {
    const input = "```json\n{\"score\": 85}\n```";
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 85 });
  });

  it("strips plain code fences", () => {
    const input = "```\n{\"ok\":true}\n```";
    expect(safeParseJson<{ ok: boolean }>(input)).toEqual({ ok: true });
  });

  it("extracts JSON when surrounded by prose", () => {
    const input = 'Here is the result: {"value": 42} — done.';
    expect(safeParseJson<{ value: number }>(input)).toEqual({ value: 42 });
  });

  it("throws for truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});
