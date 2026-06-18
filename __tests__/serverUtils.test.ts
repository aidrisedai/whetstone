import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    const fenced = "```json\n{\"x\": 42}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 42 });
  });

  it("strips code fences without the json tag", () => {
    const fenced = "```\n{\"y\": true}\n```";
    expect(safeParseJson<{ y: boolean }>(fenced)).toEqual({ y: true });
  });

  it("extracts JSON from surrounding prose", () => {
    const text = "Here is the result: {\"score\": 80} — done.";
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 80 });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns generic message for plain Error", () => {
    const msg = getErrorMessage(new Error("boom"));
    expect(msg).toBe("boom");
  });

  it("returns fallback for non-Error unknown", () => {
    const msg = getErrorMessage("some string error");
    expect(msg).toBe("Something went wrong reaching the advisor.");
  });

  it("returns fallback for null", () => {
    const msg = getErrorMessage(null);
    expect(msg).toBe("Something went wrong reaching the advisor.");
  });
});
