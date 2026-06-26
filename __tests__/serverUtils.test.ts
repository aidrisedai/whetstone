import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ a: number }>('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in markdown code fence", () => {
    const result = safeParseJson<{ x: string }>("```json\n{\"x\":\"hello\"}\n```");
    expect(result).toEqual({ x: "hello" });
  });

  it("parses JSON with surrounding prose", () => {
    const result = safeParseJson<{ v: number }>("Here's the result: {\"v\":42} done.");
    expect(result).toEqual({ v: 42 });
  });

  it("parses nested JSON objects", () => {
    const json = JSON.stringify({ outer: { inner: [1, 2, 3] } });
    expect(safeParseJson<{ outer: { inner: number[] } }>(json)).toEqual({
      outer: { inner: [1, 2, 3] },
    });
  });

  it("throws on completely unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("something went wrong");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("something went wrong");
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("bad request");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
