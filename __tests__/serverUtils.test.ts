import { describe, it, expect } from "vitest";
import { safeParseJson } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ a: number }>('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it("strips ```json code fences", () => {
    const result = safeParseJson<{ x: string }>('```json\n{"x":"hello"}\n```');
    expect(result).toEqual({ x: "hello" });
  });

  it("strips plain ``` code fences", () => {
    const result = safeParseJson<{ v: boolean }>('```\n{"v":true}\n```');
    expect(result).toEqual({ v: true });
  });

  it("extracts JSON object embedded in prose", () => {
    const result = safeParseJson<{ n: number }>(
      'Some leading text {"n":42} trailing text'
    );
    expect(result).toEqual({ n: 42 });
  });

  it("handles nested objects", () => {
    const result = safeParseJson<{ a: { b: number } }>('{"a":{"b":99}}');
    expect(result).toEqual({ a: { b: 99 } });
  });
});
