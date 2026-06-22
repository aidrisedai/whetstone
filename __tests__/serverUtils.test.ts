import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips surrounding prose", () => {
    const text = 'Here is the result:\n{"score":42}\nThat is all.';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 42 });
  });

  it("strips markdown code fences", () => {
    const text = "```json\n{\"ok\":true}\n```";
    expect(safeParseJson<{ ok: boolean }>(text)).toEqual({ ok: true });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 by default", async () => {
    const r = jsonError("bad input");
    expect(r.status).toBe(400);
    const body = await r.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("accepts a custom status code", async () => {
    const r = jsonError("upstream failed", 502);
    expect(r.status).toBe(502);
  });
});
