import { describe, it, expect } from "vitest";
import { getErrorMessage, jsonError, safeParseJson } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    const input = '```json\n{"x":"hello"}\n```';
    expect(safeParseJson<{ x: string }>(input)).toEqual({ x: "hello" });
  });

  it("strips plain code fences", () => {
    const input = '```\n{"y":42}\n```';
    expect(safeParseJson<{ y: number }>(input)).toEqual({ y: 42 });
  });

  it("extracts JSON embedded in prose", () => {
    const input = 'Here is the result: {"score":90} done.';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 90 });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 by default with JSON error body", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("respects a custom status code", async () => {
    const res = jsonError("upstream broke", 502);
    expect(res.status).toBe(502);
  });
});

describe("getErrorMessage", () => {
  it("extracts message from Error instances", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns a generic string for unknown errors", () => {
    expect(getErrorMessage(null)).toContain("wrong");
    expect(getErrorMessage(42)).toContain("wrong");
  });
});
