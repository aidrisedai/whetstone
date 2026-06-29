import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("strips ``` json ``` code fences", () => {
    const text = "```json\n{\"a\": 1}\n```";
    expect(safeParseJson<{ a: number }>(text)).toEqual({ a: 1 });
  });

  it("strips plain ``` fences", () => {
    const text = "```\n{\"a\": 1}\n```";
    expect(safeParseJson<{ a: number }>(text)).toEqual({ a: 1 });
  });

  it("extracts JSON object embedded in prose", () => {
    const text = 'Here is the result: {"score": 75} — that is the score.';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 75 });
  });

  it("handles nested objects", () => {
    const obj = { a: { b: { c: 42 } } };
    expect(safeParseJson(JSON.stringify(obj))).toEqual(obj);
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles whitespace-wrapped JSON", () => {
    expect(safeParseJson<{ x: number }>("  \n  {\"x\": 5}  \n  ")).toEqual({ x: 5 });
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("Bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Bad input");
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("Upstream failed", 502);
    expect(res.status).toBe(502);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Upstream failed");
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("Oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("returns the message for a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a fallback for non-Error throws", () => {
    expect(getErrorMessage("some string")).toBe("Something went wrong reaching the advisor.");
  });

  it("returns a fallback for null", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
