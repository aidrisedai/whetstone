import { describe, it, expect } from "vitest";
import { safeParseJson } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("strips json code fence", () => {
    const input = "```json\n{\"score\": 85}\n```";
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 85 });
  });

  it("strips plain code fence", () => {
    const input = "```\n{\"ready\": true}\n```";
    expect(safeParseJson<{ ready: boolean }>(input)).toEqual({ ready: true });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is the result: {"overall": 72} — done.';
    expect(safeParseJson<{ overall: number }>(input)).toEqual({ overall: 72 });
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});
