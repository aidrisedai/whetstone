import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses a clean JSON string", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown json code fences", () => {
    const result = safeParseJson<{ x: string }>("```json\n{\"x\":\"hello\"}\n```");
    expect(result).toEqual({ x: "hello" });
  });

  it("strips bare code fences", () => {
    const result = safeParseJson<{ y: number }>("```\n{\"y\":42}\n```");
    expect(result).toEqual({ y: 42 });
  });

  it("extracts JSON from surrounding prose", () => {
    const result = safeParseJson<{ ok: boolean }>("Here is the JSON: {\"ok\":true} and that's it.");
    expect(result).toEqual({ ok: true });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("test");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("returns Error message for a standard Error", () => {
    expect(getErrorMessage(new Error("something broke"))).toBe("something broke");
  });

  it("returns fallback string for unknown error type", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });

  it("returns fallback for null", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
