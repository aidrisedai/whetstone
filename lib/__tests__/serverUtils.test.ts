import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in code fences", () => {
    const input = "```json\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in plain code fences", () => {
    const input = "```\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("extracts JSON object surrounded by prose", () => {
    const input = 'Here is the result: {"score": 85} (as requested)';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 85 });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested objects", () => {
    const input = '{"clarity":{"score":80,"rationale":"good"},"overall":80}';
    const result = safeParseJson<{ clarity: { score: number }; overall: number }>(input);
    expect(result.clarity.score).toBe(80);
    expect(result.overall).toBe(80);
  });
});

describe("jsonError", () => {
  it("returns a Response with status 400 by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad request" });
  });

  it("returns a Response with custom status", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("upstream failed");
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("returns message from a standard Error", () => {
    expect(getErrorMessage(new Error("something broke"))).toBe("something broke");
  });

  it("returns fallback for unknown non-Error throws", () => {
    expect(getErrorMessage("just a string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});
