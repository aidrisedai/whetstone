import { describe, it, expect } from "vitest";
import { safeParseJson } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ score: number }>('{"score": 85}');
    expect(result.score).toBe(85);
  });

  it("strips json code fences", () => {
    const input = '```json\n{"score": 90}\n```';
    const result = safeParseJson<{ score: number }>(input);
    expect(result.score).toBe(90);
  });

  it("strips plain code fences", () => {
    const input = '```\n{"score": 70}\n```';
    const result = safeParseJson<{ score: number }>(input);
    expect(result.score).toBe(70);
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is the result: {"score": 75} — that is the assessment.';
    const result = safeParseJson<{ score: number }>(input);
    expect(result.score).toBe(75);
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested objects", () => {
    const input = '{"clarity": {"score": 80, "rationale": "clear"}}';
    const result = safeParseJson<{ clarity: { score: number; rationale: string } }>(input);
    expect(result.clarity.score).toBe(80);
  });
});
