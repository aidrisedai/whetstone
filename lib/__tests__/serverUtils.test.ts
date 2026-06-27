import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a ```json fence", () => {
    const input = '```json\n{"x": "hello"}\n```';
    expect(safeParseJson<{ x: string }>(input)).toEqual({ x: "hello" });
  });

  it("parses JSON wrapped in a plain ``` fence", () => {
    const input = "```\n{\"y\": 42}\n```";
    expect(safeParseJson<{ y: number }>(input)).toEqual({ y: 42 });
  });

  it("extracts JSON from prose-wrapped text", () => {
    const input = 'Here is the result: {"score": 95} — end';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 95 });
  });

  it("throws on truly unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the message from a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the fallback message for unknown types", () => {
    expect(getErrorMessage("a string error")).toBe(
      "Something went wrong reaching the advisor.",
    );
    expect(getErrorMessage(null)).toBe(
      "Something went wrong reaching the advisor.",
    );
    expect(getErrorMessage(42)).toBe(
      "Something went wrong reaching the advisor.",
    );
  });
});
