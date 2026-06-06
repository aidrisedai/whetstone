import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON objects", () => {
    expect(safeParseJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("strips json-fenced markdown", () => {
    expect(safeParseJson<{ a: number }>('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("strips bare-fenced markdown", () => {
    expect(safeParseJson<{ a: number }>('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is the result: {"score": 42, "ready": true} end';
    expect(safeParseJson<{ score: number; ready: boolean }>(input)).toEqual({
      score: 42,
      ready: true,
    });
  });

  it("handles nested objects", () => {
    const input = '{"clarity": {"score": 80, "rationale": "good"}}';
    const result = safeParseJson<{ clarity: { score: number; rationale: string } }>(input);
    expect(result.clarity.score).toBe(80);
  });

  it("throws on non-JSON input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles whitespace around JSON", () => {
    expect(safeParseJson<{ x: string }>("  { \"x\": \"y\" }  ")).toEqual({ x: "y" });
  });
});

describe("jsonError", () => {
  it("returns status 400 by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
  });

  it("returns the error message in the body", async () => {
    const res = jsonError("bad input");
    const body = await res.json();
    expect(body.error).toBe("bad input");
  });

  it("uses a custom status code", async () => {
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
