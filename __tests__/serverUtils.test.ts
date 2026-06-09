import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips triple-backtick json fences", () => {
    const fenced = '```json\n{"x":"y"}\n```';
    expect(safeParseJson<{ x: string }>(fenced)).toEqual({ x: "y" });
  });

  it("strips plain ``` fences", () => {
    const fenced = '```\n{"x":"y"}\n```';
    expect(safeParseJson<{ x: string }>(fenced)).toEqual({ x: "y" });
  });

  it("extracts JSON from surrounding prose", () => {
    const prose = 'Here is the result: {"score":42} — done.';
    expect(safeParseJson<{ score: number }>(prose)).toEqual({ score: 42 });
  });

  it("throws SyntaxError on genuinely invalid JSON", () => {
    expect(() => safeParseJson("not json")).toThrow(SyntaxError);
  });

  it("handles whitespace padding", () => {
    expect(safeParseJson<{ ok: boolean }>("  { \"ok\": true }  ")).toEqual({ ok: true });
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("uses a custom status code when provided", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});
