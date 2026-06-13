import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips json code fences", () => {
    const fenced = "```json\n{\"x\":2}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 2 });
  });

  it("strips plain code fences", () => {
    const fenced = "```\n{\"y\":3}\n```";
    expect(safeParseJson<{ y: number }>(fenced)).toEqual({ y: 3 });
  });

  it("ignores surrounding prose and extracts the JSON object", () => {
    const prose = 'Here is your result: {"score":99} — enjoy!';
    expect(safeParseJson<{ score: number }>(prose)).toEqual({ score: 99 });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("uses the provided status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("handles a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a fallback for non-Error values", () => {
    expect(getErrorMessage("string error")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});
