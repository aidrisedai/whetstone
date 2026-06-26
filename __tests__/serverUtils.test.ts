import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ foo: string }>('{"foo":"bar"}')).toEqual({ foo: "bar" });
  });

  it("strips markdown json code fences", () => {
    expect(safeParseJson<{ x: number }>('```json\n{"x":1}\n```')).toEqual({ x: 1 });
  });

  it("strips plain code fences", () => {
    expect(safeParseJson<{ x: number }>('```\n{"x":2}\n```')).toEqual({ x: 2 });
  });

  it("extracts JSON embedded in prose text", () => {
    const input = 'Here is the result: {"score":42} end of text';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 42 });
  });

  it("handles deeply nested objects", () => {
    const obj = { a: { b: { c: [1, 2, 3] } } };
    expect(safeParseJson(JSON.stringify(obj))).toEqual(obj);
  });

  it("throws on genuinely unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
    expect(() => safeParseJson("")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the message from a standard Error", () => {
    expect(getErrorMessage(new Error("something broke"))).toBe("something broke");
  });

  it("returns a fallback for non-Error values", () => {
    expect(getErrorMessage("raw string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(undefined)).toBe("Something went wrong reaching the advisor.");
  });
});
