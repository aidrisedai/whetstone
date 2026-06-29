import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x": 1}')).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    expect(safeParseJson<{ x: number }>("```json\n{\"x\": 2}\n```")).toEqual({ x: 2 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    expect(safeParseJson<{ x: number }>("```\n{\"x\": 3}\n```")).toEqual({ x: 3 });
  });

  it("extracts JSON from surrounding prose", () => {
    expect(safeParseJson<{ x: number }>("Here it is: {\"x\": 4} done")).toEqual({ x: 4 });
  });

  it("handles nested objects", () => {
    const input = JSON.stringify({ a: { b: [1, 2, 3] } });
    expect(safeParseJson<{ a: { b: number[] } }>(input)).toEqual({ a: { b: [1, 2, 3] } });
  });

  it("throws on malformed JSON after extraction", () => {
    expect(() => safeParseJson("{not valid}")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const r = jsonError("bad input");
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBe("bad input");
  });

  it("uses the provided status code", async () => {
    const r = jsonError("server error", 502);
    expect(r.status).toBe(502);
    const body = await r.json();
    expect(body.error).toBe("server error");
  });

  it("sets Content-Type to application/json", () => {
    const r = jsonError("oops");
    expect(r.headers.get("Content-Type")).toBe("application/json");
  });
});
