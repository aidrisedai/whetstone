import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    const wrapped = "```json\n{\"x\": 2}\n```";
    expect(safeParseJson<{ x: number }>(wrapped)).toEqual({ x: 2 });
    const plain = "```\n{\"x\": 2}\n```";
    expect(safeParseJson<{ x: number }>(plain)).toEqual({ x: 2 });
  });

  it("extracts JSON when surrounded by prose", () => {
    const text = 'Here is the result: {"score": 88} — done.';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 88 });
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const r = jsonError("bad request");
    expect(r.status).toBe(400);
    const body = await r.json() as { error: string };
    expect(body.error).toBe("bad request");
  });

  it("accepts a custom status code", async () => {
    const r = jsonError("gateway error", 502);
    expect(r.status).toBe(502);
  });
});
