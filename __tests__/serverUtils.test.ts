import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences before parsing", () => {
    expect(safeParseJson<{ x: string }>("```json\n{\"x\":\"y\"}\n```")).toEqual({ x: "y" });
  });

  it("extracts the object even with surrounding prose", () => {
    const text = 'Here is the result: {"score": 72} end.';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 72 });
  });

  it("throws on truly unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the message for a plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns a fallback for non-Error values", () => {
    expect(getErrorMessage("string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("jsonError", () => {
  it("returns a 400 response with the error message by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("respects a custom status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });
});
