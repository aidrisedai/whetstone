import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ x: number }>('{"x": 42}');
    expect(result).toEqual({ x: 42 });
  });

  it("strips code fences before parsing", () => {
    const result = safeParseJson<{ ok: boolean }>("```json\n{\"ok\": true}\n```");
    expect(result).toEqual({ ok: true });
  });

  it("strips bare ``` fences", () => {
    const result = safeParseJson<{ ok: boolean }>("```\n{\"ok\": true}\n```");
    expect(result).toEqual({ ok: true });
  });

  it("extracts JSON object from surrounding prose", () => {
    const result = safeParseJson<{ n: number }>("Here is the result: {\"n\": 7} done.");
    expect(result).toEqual({ n: 7 });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested objects", () => {
    const result = safeParseJson<{ a: { b: number } }>('{"a": {"b": 1}}');
    expect(result).toEqual({ a: { b: 1 } });
  });
});

describe("getErrorMessage", () => {
  it("extracts message from Error objects", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a fallback for non-Error values", () => {
    expect(getErrorMessage("oops")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
