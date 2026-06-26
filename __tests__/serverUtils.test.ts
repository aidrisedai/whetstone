import { describe, expect, it } from "vitest";
import { getErrorMessage, jsonError, safeParseJson } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    const wrapped = "```json\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(wrapped)).toEqual({ a: 1 });
  });

  it("strips plain code fences", () => {
    const wrapped = "```\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(wrapped)).toEqual({ a: 1 });
  });

  it("extracts JSON object from surrounding prose", () => {
    const prose = 'Here is the result: {"score": 80} and that\'s it.';
    expect(safeParseJson<{ score: number }>(prose)).toEqual({ score: 80 });
  });

  it("throws for completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("respects a custom status code", async () => {
    const res = jsonError("server error", 502);
    expect(res.status).toBe(502);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("server error");
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("test");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("returns message from a plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns fallback for non-Error objects", () => {
    expect(getErrorMessage("string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});
