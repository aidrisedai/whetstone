import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });
  it("strips ```json fences", () => {
    expect(safeParseJson<{ a: number }>("```json\n{\"a\":2}\n```")).toEqual({ a: 2 });
  });
  it("strips plain ``` fences", () => {
    expect(safeParseJson<{ x: string }>("```\n{\"x\":\"hi\"}\n```")).toEqual({ x: "hi" });
  });
  it("extracts JSON embedded in prose", () => {
    expect(safeParseJson<{ ok: boolean }>("Here you go: {\"ok\":true} done.")).toEqual({ ok: true });
  });
  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the error message for a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });
  it("returns a fallback string for unknown values", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
