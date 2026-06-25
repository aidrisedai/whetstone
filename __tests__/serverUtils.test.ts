import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x": 1}')).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in a code fence", () => {
    expect(safeParseJson<{ x: number }>('```json\n{"x": 2}\n```')).toEqual({ x: 2 });
  });

  it("parses JSON wrapped in a generic code fence", () => {
    expect(safeParseJson<{ x: number }>('```\n{"x": 3}\n```')).toEqual({ x: 3 });
  });

  it("strips prose surrounding JSON", () => {
    expect(safeParseJson<{ a: string }>('Sure! Here is the result:\n{"a":"b"}\nHope this helps.')).toEqual({ a: "b" });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson<unknown>("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns message from a standard Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns a fallback for non-Error throws", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
