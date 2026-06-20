import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in code fences", () => {
    const fenced = '```json\n{"a":1}\n```';
    expect(safeParseJson<{ a: number }>(fenced)).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in plain fences", () => {
    const fenced = '```\n{"a":1}\n```';
    expect(safeParseJson<{ a: number }>(fenced)).toEqual({ a: 1 });
  });

  it("extracts the first JSON object from surrounding text", () => {
    const text = 'Here is the result: {"key":"value"} and some trailing text.';
    expect(safeParseJson<{ key: string }>(text)).toEqual({ key: "value" });
  });

  it("throws on truly unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles empty string input by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("Something went wrong");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Something went wrong" });
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

describe("getErrorMessage", () => {
  it("returns the message for a plain Error", () => {
    const msg = getErrorMessage(new Error("broke"));
    expect(msg).toBe("broke");
  });

  it("returns a fallback for non-Error values", () => {
    expect(getErrorMessage("a string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
