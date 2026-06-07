import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "../lib/serverUtils";

// --- safeParseJson ---

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const result = safeParseJson<{ a: number }>('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it("strips json code fences", () => {
    const result = safeParseJson<{ b: string }>('```json\n{"b": "hello"}\n```');
    expect(result).toEqual({ b: "hello" });
  });

  it("strips plain code fences", () => {
    const result = safeParseJson<{ c: boolean }>('```\n{"c": true}\n```');
    expect(result).toEqual({ c: true });
  });

  it("handles prose before and after JSON", () => {
    const result = safeParseJson<{ x: number }>('Here is the result: {"x": 42} done.');
    expect(result).toEqual({ x: 42 });
  });

  it("throws on truly unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

// --- getErrorMessage ---

describe("getErrorMessage", () => {
  it("surfaces Error.message for plain errors", () => {
    const msg = getErrorMessage(new Error("something broke"));
    expect(msg).toBe("something broke");
  });

  it("returns fallback string for non-Error values", () => {
    const msg = getErrorMessage(42);
    expect(msg).toContain("Something went wrong");
  });

  it("returns fallback for null", () => {
    const msg = getErrorMessage(null);
    expect(msg).toContain("Something went wrong");
  });
});

// --- jsonError ---

describe("jsonError", () => {
  it("returns a 400 response with JSON body by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("respects a custom status code", async () => {
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("upstream error");
  });

  it("sets Content-Type: application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
