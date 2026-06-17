import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses a clean JSON string", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in ```json code fence", () => {
    const text = "```json\n{\"x\":1}\n```";
    expect(safeParseJson<{ x: number }>(text)).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in plain ``` fence", () => {
    expect(safeParseJson<{ x: number }>("```\n{\"x\":2}\n```")).toEqual({ x: 2 });
  });

  it("parses JSON embedded in prose", () => {
    const text = 'Here is the result: {"score":42} — done.';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 42 });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response with the error message by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("respects a custom status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });
});

describe("getErrorMessage", () => {
  it("extracts message from an Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns generic fallback for non-Error values", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});
