import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses a clean JSON string", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips code fences (```json ... ```)", () => {
    expect(safeParseJson<{ x: number }>('```json\n{"x":2}\n```')).toEqual({ x: 2 });
  });

  it("strips plain code fences (``` ... ```)", () => {
    expect(safeParseJson<{ x: number }>('```\n{"x":3}\n```')).toEqual({ x: 3 });
  });

  it("extracts JSON embedded in prose", () => {
    const input = 'Here is the result: {"score":95} — done.';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 95 });
  });

  it("throws on non-JSON input", () => {
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

  it("accepts a custom status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });
});

describe("getErrorMessage", () => {
  it("returns the message from a plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns a fallback string for non-Error values", () => {
    expect(getErrorMessage("string throw")).toBe(
      "Something went wrong reaching the advisor.",
    );
  });
});
