import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips markdown code fences", () => {
    const input = "```json\n{\"key\":\"value\"}\n```";
    expect(safeParseJson<{ key: string }>(input)).toEqual({ key: "value" });
  });

  it("strips plain code fences (no language)", () => {
    const input = "```\n{\"a\":true}\n```";
    expect(safeParseJson<{ a: boolean }>(input)).toEqual({ a: true });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is the result: {"score":80} — that is all.';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 80 });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles empty string by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("bad");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
