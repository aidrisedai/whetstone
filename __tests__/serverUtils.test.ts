import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson } from "../lib/serverUtils";

describe("getErrorMessage", () => {
  it("returns the message from an Error instance", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a fallback for unknown throws", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips markdown code fences", () => {
    expect(safeParseJson<{ x: number }>('```json\n{"x":1}\n```')).toEqual({ x: 1 });
  });

  it("strips plain fences", () => {
    expect(safeParseJson<{ x: number }>('```\n{"x":2}\n```')).toEqual({ x: 2 });
  });

  it("extracts the first JSON object from surrounding prose", () => {
    expect(safeParseJson<{ a: string }>('Here is the result: {"a":"hello"} and done.')).toEqual({
      a: "hello",
    });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });
});
