import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown json fences", () => {
    expect(safeParseJson<{ a: number }>("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("strips plain code fences", () => {
    expect(safeParseJson<{ a: number }>("```\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("handles leading prose before JSON object", () => {
    expect(safeParseJson<{ ok: boolean }>('Here is the result: {"ok":true}')).toEqual({ ok: true });
  });

  it("handles trailing prose after JSON object", () => {
    expect(safeParseJson<{ ok: boolean }>('{"ok":true} Done!')).toEqual({ ok: true });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns message for Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback for unknown errors", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("jsonError", () => {
  it("returns a 400 response with error JSON by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("uses a custom status code when provided", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });
});
