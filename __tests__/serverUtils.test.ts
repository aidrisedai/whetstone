import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ x: number }>('{"x": 1}');
    expect(result.x).toBe(1);
  });

  it("strips json code fences", () => {
    const result = safeParseJson<{ x: number }>('```json\n{"x": 2}\n```');
    expect(result.x).toBe(2);
  });

  it("strips plain code fences", () => {
    const result = safeParseJson<{ x: number }>('```\n{"x": 3}\n```');
    expect(result.x).toBe(3);
  });

  it("extracts JSON embedded in prose", () => {
    const result = safeParseJson<{ a: string }>('Here is the result: {"a": "ok"} done.');
    expect(result.a).toBe("ok");
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the message for a generic Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a fallback string for non-Error throws", () => {
    expect(getErrorMessage("oops")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
