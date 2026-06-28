import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips markdown code fences", () => {
    const input = "```json\n{\"x\":2}\n```";
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 2 });
  });

  it("strips leading prose before the object", () => {
    const input = 'Here is the JSON:\n{"x":3}';
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 3 });
  });

  it("strips trailing prose after the object", () => {
    const input = '{"x":4}\n\nDone.';
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 4 });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("Bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Bad input" });
  });

  it("respects a custom status code", async () => {
    const res = jsonError("Not found", 404);
    expect(res.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
