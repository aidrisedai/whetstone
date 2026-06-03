import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a json code fence", () => {
    const input = "```json\n{\"a\":2}\n```";
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 2 });
  });

  it("parses JSON wrapped in a plain code fence", () => {
    const input = "```\n{\"a\":3}\n```";
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 3 });
  });

  it("extracts JSON surrounded by prose", () => {
    const input = 'Here is the result: {"a":4} — done!';
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 4 });
  });

  it("parses nested objects", () => {
    const input = '{"outer":{"inner":true}}';
    expect(safeParseJson<{ outer: { inner: boolean } }>(input)).toEqual({
      outer: { inner: true },
    });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles empty string by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 Response by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad request" });
  });

  it("respects a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "not found" });
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("returns a 500 for server errors", async () => {
    const res = jsonError("internal error", 500);
    expect(res.status).toBe(500);
  });
});
