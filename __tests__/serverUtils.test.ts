import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ x: number }>('{"x": 42}');
    expect(result.x).toBe(42);
  });

  it("parses JSON wrapped in markdown code fence", () => {
    const result = safeParseJson<{ a: string }>('```json\n{"a":"hello"}\n```');
    expect(result.a).toBe("hello");
  });

  it("parses JSON wrapped in plain code fence", () => {
    const result = safeParseJson<{ b: number }>('```\n{"b":7}\n```');
    expect(result.b).toBe(7);
  });

  it("extracts JSON from prose surrounding it", () => {
    const result = safeParseJson<{ ok: boolean }>('Here is the result: {"ok":true} as requested.');
    expect(result.ok).toBe(true);
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const r = jsonError("bad input");
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBe("bad input");
  });

  it("respects a custom status code", async () => {
    const r = jsonError("upstream failed", 502);
    expect(r.status).toBe(502);
    const body = await r.json();
    expect(body.error).toBe("upstream failed");
  });

  it("sets Content-Type to application/json", () => {
    const r = jsonError("oops");
    expect(r.headers.get("Content-Type")).toBe("application/json");
  });
});
