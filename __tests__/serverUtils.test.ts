import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses a plain JSON object", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    expect(safeParseJson<{ x: string }>('```json\n{"x":"y"}\n```')).toEqual({ x: "y" });
  });

  it("strips plain code fences without a language tag", () => {
    expect(safeParseJson<{ x: string }>('```\n{"x":"z"}\n```')).toEqual({ x: "z" });
  });

  it("extracts JSON embedded in stray prose", () => {
    expect(safeParseJson<{ v: number }>("Here you go: { \"v\": 42 } done.")).toEqual({ v: 42 });
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns the message for a generic Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the fallback string for unknown throws", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("jsonError", () => {
  it("returns a 400 response with JSON body by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("respects a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
