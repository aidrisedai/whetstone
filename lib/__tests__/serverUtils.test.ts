import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    expect(safeParseJson<{ x: string }>("```json\n{\"x\":\"y\"}\n```")).toEqual({ x: "y" });
  });

  it("strips generic code fences", () => {
    expect(safeParseJson<{ v: number }>("```\n{\"v\":42}\n```")).toEqual({ v: 42 });
  });

  it("extracts JSON from surrounding prose", () => {
    expect(safeParseJson<{ n: number }>("Here is the result: {\"n\":7} done.")).toEqual({ n: 7 });
  });

  it("throws on genuinely malformed input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles null/undefined text gracefully by throwing", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const r = jsonError("bad input");
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("honours a custom status code", async () => {
    const r = jsonError("upstream error", 502);
    expect(r.status).toBe(502);
    const body = await r.json();
    expect(body).toEqual({ error: "upstream error" });
  });

  it("sets Content-Type to application/json", () => {
    const r = jsonError("oops");
    expect(r.headers.get("Content-Type")).toBe("application/json");
  });
});
