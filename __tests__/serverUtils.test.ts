import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ a: number }>('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it("strips markdown json code fences", () => {
    const fenced = "```json\n{\"a\": 2}\n```";
    expect(safeParseJson<{ a: number }>(fenced)).toEqual({ a: 2 });
  });

  it("strips plain code fences", () => {
    const fenced = "```\n{\"x\": true}\n```";
    expect(safeParseJson<{ x: boolean }>(fenced)).toEqual({ x: true });
  });

  it("extracts JSON from surrounding prose", () => {
    const messy = 'Here is the result: {"score": 75} — hope that helps.';
    expect(safeParseJson<{ score: number }>(messy)).toEqual({ score: 75 });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response with the message by default", async () => {
    const res = jsonError("something went wrong");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("something went wrong");
  });

  it("honours a custom status code", async () => {
    const res = jsonError("upstream broke", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
