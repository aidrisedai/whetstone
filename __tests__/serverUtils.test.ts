import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips code fences", () => {
    const text = '```json\n{"key":"value"}\n```';
    expect(safeParseJson<{ key: string }>(text)).toEqual({ key: "value" });
  });

  it("strips code fences without language tag", () => {
    const text = '```\n{"x":99}\n```';
    expect(safeParseJson<{ x: number }>(text)).toEqual({ x: 99 });
  });

  it("extracts JSON from surrounding prose", () => {
    const text = 'Here is the result: {"ok":true} — done.';
    expect(safeParseJson<{ ok: boolean }>(text)).toEqual({ ok: true });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json at all !!!")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns 400 by default", () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
  });

  it("returns the provided status code", () => {
    const res = jsonError("gateway error", 502);
    expect(res.status).toBe(502);
  });

  it("returns JSON content-type", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("body contains the error message", async () => {
    const res = jsonError("something broke");
    const body = await res.json();
    expect(body.error).toBe("something broke");
  });
});
