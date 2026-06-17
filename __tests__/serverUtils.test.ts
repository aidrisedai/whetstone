import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const fenced = "```json\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(fenced)).toEqual({ a: 1 });
  });

  it("strips prose before the first { and after the last }", () => {
    const text = "Here is the result:\n{\"a\":1}\nDone.";
    expect(safeParseJson<{ a: number }>(text)).toEqual({ a: 1 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("{not-json}")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 Response with JSON body by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad request");
    expect(res.headers.get("Content-Type")).toContain("application/json");
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });
});
