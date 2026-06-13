import { describe, expect, it } from "vitest";
import { getErrorMessage, jsonError, safeParseJson } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    expect(safeParseJson<{ x: string }>('```json\n{"x":"y"}\n```')).toEqual({ x: "y" });
  });

  it("strips plain code fences", () => {
    expect(safeParseJson<{ x: string }>('```\n{"x":"y"}\n```')).toEqual({ x: "y" });
  });

  it("extracts JSON from surrounding prose", () => {
    expect(safeParseJson<{ v: number }>('Here is the result: {"v":42} done.')).toEqual({ v: 42 });
  });

  it("throws SyntaxError for invalid JSON", () => {
    expect(() => safeParseJson("{invalid}")).toThrow(SyntaxError);
  });

  it("throws SyntaxError for completely empty string", () => {
    expect(() => safeParseJson("")).toThrow(SyntaxError);
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad request" });
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("returns message for standard Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns fallback for non-Error values", () => {
    expect(getErrorMessage("string error")).toBe("Something went wrong reaching the advisor.");
  });

  it("returns fallback for null", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
