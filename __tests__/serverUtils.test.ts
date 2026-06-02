import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "@/lib/serverUtils";

describe("getErrorMessage", () => {
  it("returns message from Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback string for unknown errors", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(undefined)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips markdown code fences", () => {
    const fenced = "```json\n{\"x\":1}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 1 });
  });

  it("strips code fences without language tag", () => {
    const fenced = "```\n{\"x\":2}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 2 });
  });

  it("extracts object from surrounding prose", () => {
    const text = 'Here is the result: {"x":3} — done.';
    expect(safeParseJson<{ x: number }>(text)).toEqual({ x: 3 });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });

  it("handles empty string", () => {
    expect(() => safeParseJson("")).toThrow();
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
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "upstream error" });
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
