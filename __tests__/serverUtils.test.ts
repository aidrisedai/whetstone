import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ a: number }>('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    const result = safeParseJson<{ x: string }>("```json\n{\"x\":\"hi\"}\n```");
    expect(result).toEqual({ x: "hi" });
  });

  it("strips prose before and after the JSON object", () => {
    const result = safeParseJson<{ n: number }>("Here is the result: {\"n\":42} — done.");
    expect(result).toEqual({ n: 42 });
  });

  it("handles code fences without a language tag", () => {
    const result = safeParseJson<{ ok: boolean }>("```\n{\"ok\":true}\n```");
    expect(result).toEqual({ ok: true });
  });

  it("throws on unparseable input", () => {
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
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "upstream error" });
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("x");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("returns the message of an Error instance", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a fallback for unknown values", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
