import { describe, it, expect } from "vitest";
import { safeParseJson } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON strings", () => {
    const result = safeParseJson<{ ok: boolean }>('{"ok": true}');
    expect(result.ok).toBe(true);
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const result = safeParseJson<{ score: number }>("```json\n{\"score\": 90}\n```");
    expect(result.score).toBe(90);
  });

  it("parses JSON wrapped in plain code fences", () => {
    const result = safeParseJson<{ name: string }>("```\n{\"name\": \"bolt\"}\n```");
    expect(result.name).toBe("bolt");
  });

  it("extracts JSON from surrounding prose", () => {
    const result = safeParseJson<{ value: number }>(
      'Here is your result: {"value": 42} and some trailing text.',
    );
    expect(result.value).toBe(42);
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson<unknown>("not json at all")).toThrow();
  });

  it("handles nested JSON objects", () => {
    const result = safeParseJson<{ a: { b: number } }>('{"a": {"b": 7}}');
    expect(result.a.b).toBe(7);
  });
});
