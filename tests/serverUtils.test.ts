import { describe, it, expect } from "vitest";
import { safeParseJson } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON objects", () => {
    const result = safeParseJson<{ score: number }>('{"score": 72}');
    expect(result.score).toBe(72);
  });

  it("extracts JSON from a markdown json code fence", () => {
    const text = "Here is the result:\n```json\n{\"score\": 88}\n```";
    const result = safeParseJson<{ score: number }>(text);
    expect(result.score).toBe(88);
  });

  it("extracts JSON from a plain code fence", () => {
    const text = "```\n{\"score\": 55}\n```";
    const result = safeParseJson<{ score: number }>(text);
    expect(result.score).toBe(55);
  });

  it("extracts the JSON object when surrounded by stray prose", () => {
    const text = 'Sure! Here you go: {"score": 91} — that is the result.';
    const result = safeParseJson<{ score: number }>(text);
    expect(result.score).toBe(91);
  });

  it("handles nested objects", () => {
    const text = '{"clarity": {"score": 70, "rationale": "ok", "suggestion": "add more"}}';
    const result = safeParseJson<{ clarity: { score: number } }>(text);
    expect(result.clarity.score).toBe(70);
  });

  it("throws a SyntaxError on invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow(SyntaxError);
  });

  it("handles empty/null text gracefully by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});
