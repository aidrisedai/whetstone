import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ a: number }>('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    const result = safeParseJson<{ x: string }>("```json\n{\"x\":\"hello\"}\n```");
    expect(result).toEqual({ x: "hello" });
  });

  it("strips leading prose before the opening brace", () => {
    const result = safeParseJson<{ ok: boolean }>("Here is the result: {\"ok\":true}");
    expect(result).toEqual({ ok: true });
  });

  it("throws a descriptive error for truly malformed JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow("Model returned unparseable JSON");
  });

  it("handles empty string gracefully", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the message from a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback for unknown error types", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
