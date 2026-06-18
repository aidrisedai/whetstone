import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../serverUtils";

// ---------------------------------------------------------------------------
// safeParseJson
// ---------------------------------------------------------------------------
describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    const input = "```json\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const input = "```\n{\"b\":2}\n```";
    expect(safeParseJson<{ b: number }>(input)).toEqual({ b: 2 });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is the result: {"score":99} — done.';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 99 });
  });

  it("handles leading/trailing whitespace", () => {
    expect(safeParseJson<{ x: string }>("  \n { \"x\": \"y\" } \n  ")).toEqual({ x: "y" });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// jsonError
// ---------------------------------------------------------------------------
describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("returns a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "not found" });
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
