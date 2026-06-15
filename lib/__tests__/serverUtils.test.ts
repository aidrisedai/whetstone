import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    const fenced = "```json\n{\"key\": \"value\"}\n```";
    expect(safeParseJson<{ key: string }>(fenced)).toEqual({ key: "value" });
  });

  it("parses JSON wrapped in plain fences", () => {
    const fenced = "```\n{\"x\": 42}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 42 });
  });

  it("parses JSON embedded in surrounding prose", () => {
    const text = 'Here is the result: {"score": 88} — looks good!';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 88 });
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the message for generic Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the fallback for unknown non-Error values", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage("a string")).toBe("Something went wrong reaching the advisor.");
  });
});
