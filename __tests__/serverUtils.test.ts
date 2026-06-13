import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a code fence", () => {
    const fenced = '```json\n{"key":"value"}\n```';
    expect(safeParseJson<{ key: string }>(fenced)).toEqual({ key: "value" });
  });

  it("parses JSON wrapped in a bare fence", () => {
    const fenced = '```\n{"x":42}\n```';
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 42 });
  });

  it("extracts JSON from surrounding prose", () => {
    const text = 'Here is the result: {"score":95} — hope that helps!';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 95 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns a string for plain Error", () => {
    const msg = getErrorMessage(new Error("oops"));
    expect(msg).toBe("oops");
  });

  it("returns a fallback for unknown errors", () => {
    const msg = getErrorMessage({ weird: true });
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("returns a fallback for null", () => {
    const msg = getErrorMessage(null);
    expect(typeof msg).toBe("string");
  });
});

describe("jsonError", () => {
  it("returns 400 by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("respects a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
