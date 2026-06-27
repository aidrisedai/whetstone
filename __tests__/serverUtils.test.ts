import { describe, it, expect } from "vitest";
import { safeParseJson } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const result = safeParseJson<{ ok: boolean }>('{"ok":true}');
    expect(result).toEqual({ ok: true });
  });

  it("parses JSON wrapped in code fences", () => {
    const input = '```json\n{"score":85}\n```';
    const result = safeParseJson<{ score: number }>(input);
    expect(result).toEqual({ score: 85 });
  });

  it("parses JSON wrapped in generic code fences", () => {
    const input = "```\n{\"foo\":\"bar\"}\n```";
    const result = safeParseJson<{ foo: string }>(input);
    expect(result).toEqual({ foo: "bar" });
  });

  it("strips leading/trailing prose around JSON", () => {
    const input = 'Here is the result: {"value":42} — that\'s it.';
    const result = safeParseJson<{ value: number }>(input);
    expect(result).toEqual({ value: 42 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json at all, no braces")).toThrow();
  });

  it("handles null input by treating as empty string", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });

  it("parses nested objects", () => {
    const input = '{"a":{"b":1}}';
    const result = safeParseJson<{ a: { b: number } }>(input);
    expect(result.a.b).toBe(1);
  });
});
