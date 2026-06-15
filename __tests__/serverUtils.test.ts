import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "@/lib/serverUtils";

// ─── safeParseJson ────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses clean JSON objects", () => {
    const result = safeParseJson<{ a: number }>('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it("strips JSON code fences", () => {
    const result = safeParseJson<{ x: string }>('```json\n{"x":"y"}\n```');
    expect(result).toEqual({ x: "y" });
  });

  it("strips plain code fences", () => {
    const result = safeParseJson<{ z: boolean }>('```\n{"z":true}\n```');
    expect(result).toEqual({ z: true });
  });

  it("extracts JSON embedded in prose", () => {
    const result = safeParseJson<{ score: number }>(
      'Here is the result: {"score":85} and some trailing text.',
    );
    expect(result).toEqual({ score: 85 });
  });

  it("handles leading/trailing whitespace", () => {
    const result = safeParseJson<{ a: string }>("   \n  {\"a\":\"b\"}  \n  ");
    expect(result).toEqual({ a: "b" });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

// ─── getErrorMessage ──────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("extracts message from a standard Error", () => {
    const err = new Error("Something broke");
    expect(getErrorMessage(err)).toBe("Something broke");
  });

  it("returns a fallback for non-Error values", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(undefined)).toBe("Something went wrong reaching the advisor.");
  });

  it("returns a fallback for plain objects without message", () => {
    expect(getErrorMessage({ code: 500 })).toBe("Something went wrong reaching the advisor.");
  });
});

// ─── jsonError ────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("bad input");
  });

  it("uses the provided status code", async () => {
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("upstream error");
  });

  it("sets the Content-Type header to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
