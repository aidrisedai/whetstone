import { describe, expect, it } from "vitest";
import { safeParseJson } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ foo: string }>('{"foo":"bar"}');
    expect(result).toEqual({ foo: "bar" });
  });

  it("strips markdown code fences (with language)", () => {
    const fenced = '```json\n{"foo":"bar"}\n```';
    const result = safeParseJson<{ foo: string }>(fenced);
    expect(result).toEqual({ foo: "bar" });
  });

  it("strips markdown code fences (without language)", () => {
    const fenced = '```\n{"foo":"bar"}\n```';
    const result = safeParseJson<{ foo: string }>(fenced);
    expect(result).toEqual({ foo: "bar" });
  });

  it("extracts JSON object embedded in prose", () => {
    const prose = 'Here is the output: {"foo":"bar"} end of message';
    const result = safeParseJson<{ foo: string }>(prose);
    expect(result).toEqual({ foo: "bar" });
  });

  it("throws for completely unparsable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested JSON correctly", () => {
    const input = '{"outer":{"inner":42}}';
    const result = safeParseJson<{ outer: { inner: number } }>(input);
    expect(result.outer.inner).toBe(42);
  });

  it("handles whitespace-only input gracefully by throwing", () => {
    expect(() => safeParseJson("   ")).toThrow();
  });
});
