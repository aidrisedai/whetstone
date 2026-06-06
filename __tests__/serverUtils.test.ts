import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const input = '```json\n{"x":2}\n```';
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 2 });
  });

  it("parses JSON wrapped in plain code fences", () => {
    const input = '```\n{"x":3}\n```';
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 3 });
  });

  it("strips leading prose before the first {", () => {
    const input = 'Here is the result:\n{"score":90}';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 90 });
  });

  it("strips trailing prose after the last }", () => {
    const input = '{"score":90}\nHope that helps!';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 90 });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("uses the provided status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "upstream failed" });
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
