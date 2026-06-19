import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a markdown code fence", () => {
    const input = '```json\n{"x":"hello"}\n```';
    expect(safeParseJson<{ x: string }>(input)).toEqual({ x: "hello" });
  });

  it("parses JSON wrapped in a plain code fence", () => {
    const input = "```\n{\"y\":42}\n```";
    expect(safeParseJson<{ y: number }>(input)).toEqual({ y: 42 });
  });

  it("extracts JSON from prose-surrounded text", () => {
    const input = 'Here is the result: {"score":99} — enjoy!';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 99 });
  });

  it("throws SyntaxError for invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow(SyntaxError);
  });

  it("handles nested JSON objects", () => {
    const input = '{"a":{"b":{"c":3}}}';
    expect(safeParseJson<{ a: { b: { c: number } } }>(input)).toEqual({ a: { b: { c: 3 } } });
  });
});

describe("getErrorMessage", () => {
  it("returns message from a plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns fallback for a string value", () => {
    expect(getErrorMessage("some string")).toBe("Something went wrong reaching the advisor.");
  });

  it("returns fallback for null", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });

  it("returns fallback for a number", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("jsonError", () => {
  it("returns a Response with status 400 by default", async () => {
    const resp = jsonError("bad input");
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("accepts a custom status code", async () => {
    const resp = jsonError("not found", 404);
    expect(resp.status).toBe(404);
    const body = await resp.json();
    expect(body).toEqual({ error: "not found" });
  });

  it("sets Content-Type to application/json", () => {
    const resp = jsonError("err");
    expect(resp.headers.get("Content-Type")).toBe("application/json");
  });
});
