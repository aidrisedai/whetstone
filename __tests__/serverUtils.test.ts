import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "@/lib/serverUtils";

describe("getErrorMessage", () => {
  it("extracts message from a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback for non-Error values", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(undefined)).toBe("Something went wrong reaching the advisor.");
  });

  it("handles string throws", () => {
    expect(getErrorMessage("raw string error")).toBe("Something went wrong reaching the advisor.");
  });
});

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x": 1}')).toEqual({ x: 1 });
  });

  it("strips code fences before parsing", () => {
    const fenced = "```json\n{\"x\": 2}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 2 });
  });

  it("strips markdown fences without language label", () => {
    const fenced = "```\n{\"y\": 3}\n```";
    expect(safeParseJson<{ y: number }>(fenced)).toEqual({ y: 3 });
  });

  it("tolerates leading prose before the JSON object", () => {
    const prose = 'Here is the result: {"key": "value"}';
    expect(safeParseJson<{ key: string }>(prose)).toEqual({ key: "value" });
  });

  it("tolerates trailing text after the closing brace", () => {
    const text = '{"a": 1} some extra text';
    expect(safeParseJson<{ a: number }>(text)).toEqual({ a: 1 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("something broke");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "something broke" });
  });

  it("respects a custom status code", async () => {
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "upstream error" });
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
