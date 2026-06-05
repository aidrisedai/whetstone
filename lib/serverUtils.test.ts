import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips JSON code fences", () => {
    const fenced = "```json\n{\"x\":2}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 2 });
  });

  it("strips plain code fences", () => {
    const fenced = "```\n{\"x\":3}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 3 });
  });

  it("extracts JSON from surrounding prose", () => {
    const prose = 'Here is the result: {"score":75} — hope that helps!';
    expect(safeParseJson<{ score: number }>(prose)).toEqual({ score: 75 });
  });

  it("returns empty object on totally invalid input", () => {
    expect(safeParseJson("not json at all")).toEqual({});
  });

  it("returns empty object on empty string", () => {
    expect(safeParseJson("")).toEqual({});
  });

  it("handles null-ish text gracefully", () => {
    // @ts-expect-error testing runtime safety
    expect(() => safeParseJson(null)).not.toThrow();
  });
});

describe("jsonError", () => {
  it("returns 400 by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("respects a custom status code", async () => {
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
