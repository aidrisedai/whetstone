import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown json fence", () => {
    expect(safeParseJson<{ x: string }>("```json\n{\"x\":\"y\"}\n```")).toEqual({ x: "y" });
  });

  it("strips plain backtick fence", () => {
    expect(safeParseJson<{ n: number }>("```\n{\"n\":42}\n```")).toEqual({ n: 42 });
  });

  it("extracts JSON from surrounding prose", () => {
    const text = 'Here is the result: {"score":99} done.';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 99 });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the message for a plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns fallback for non-Error unknowns", () => {
    expect(getErrorMessage("raw string")).toBe("Something went wrong reaching the advisor.");
  });

  it("returns fallback for null", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("jsonError", () => {
  it("returns 400 by default", () => {
    const r = jsonError("bad request");
    expect(r.status).toBe(400);
  });

  it("accepts a custom status code", () => {
    const r = jsonError("upstream error", 502);
    expect(r.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const r = jsonError("bad");
    expect(r.headers.get("Content-Type")).toBe("application/json");
  });

  it("body contains the error message", async () => {
    const r = jsonError("something broke");
    const body = await r.json() as { error: string };
    expect(body.error).toBe("something broke");
  });
});
