import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips json code fences", () => {
    const text = '```json\n{"x":2}\n```';
    expect(safeParseJson<{ x: number }>(text)).toEqual({ x: 2 });
  });

  it("strips plain code fences", () => {
    const text = '```\n{"y":3}\n```';
    expect(safeParseJson<{ y: number }>(text)).toEqual({ y: 3 });
  });

  it("extracts JSON from surrounding prose", () => {
    const text = 'Here is your result: {"score":42} as requested.';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 42 });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response with the error message", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });
});

describe("getErrorMessage", () => {
  it("returns a friendly message for a plain Error", () => {
    const msg = getErrorMessage(new Error("oops"));
    expect(msg).toBe("oops");
  });

  it("returns a fallback for non-Error unknowns", () => {
    expect(getErrorMessage("string error")).toBe(
      "Something went wrong reaching the advisor.",
    );
    expect(getErrorMessage(null)).toBe(
      "Something went wrong reaching the advisor.",
    );
  });
});
