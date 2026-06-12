import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x": 1}')).toEqual({ x: 1 });
  });

  it("strips json code fences", () => {
    const input = "```json\n{\"x\": 1}\n```";
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 1 });
  });

  it("strips plain code fences", () => {
    const input = "```\n{\"x\": 1}\n```";
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 1 });
  });

  it("extracts JSON when wrapped in prose", () => {
    const input = 'Here is the result: {"name": "test"} — hope that helps!';
    expect(safeParseJson<{ name: string }>(input)).toEqual({ name: "test" });
  });

  it("handles nested objects", () => {
    const input = '{"a": {"b": 2}}';
    expect(safeParseJson<{ a: { b: number } }>(input)).toEqual({ a: { b: 2 } });
  });

  it("throws on unparseable input", () => {
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
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
