import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "@/lib/serverUtils";

describe("getErrorMessage", () => {
  it("returns the error message for a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a fallback for non-Error values", () => {
    expect(getErrorMessage("raw string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips json code fences", () => {
    const fenced = "```json\n{\"x\": 2}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 2 });
  });

  it("strips plain code fences", () => {
    const fenced = "```\n{\"y\": 3}\n```";
    expect(safeParseJson<{ y: number }>(fenced)).toEqual({ y: 3 });
  });

  it("extracts JSON embedded in prose", () => {
    const prose = 'Here is the result: {"val": 7} and some trailing text.';
    expect(safeParseJson<{ val: number }>(prose)).toEqual({ val: 7 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a Response with the correct status and JSON body", async () => {
    const res = jsonError("bad input", 400);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("defaults to 400 when no status is provided", async () => {
    const res = jsonError("oops");
    expect(res.status).toBe(400);
  });

  it("propagates non-400 status codes", async () => {
    const res = jsonError("server fail", 502);
    expect(res.status).toBe(502);
  });
});
