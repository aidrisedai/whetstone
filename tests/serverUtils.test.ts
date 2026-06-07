import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../lib/serverUtils";

// ── safeParseJson ────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ x: number }>('{"x":1}');
    expect(result).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in json code fences", () => {
    const result = safeParseJson<{ ok: boolean }>("```json\n{\"ok\":true}\n```");
    expect(result).toEqual({ ok: true });
  });

  it("parses JSON wrapped in plain code fences", () => {
    const result = safeParseJson<{ v: string }>("```\n{\"v\":\"hello\"}\n```");
    expect(result).toEqual({ v: "hello" });
  });

  it("strips leading/trailing prose around JSON", () => {
    const result = safeParseJson<{ score: number }>(
      'Here is the result:\n{"score":42}\nDone.'
    );
    expect(result).toEqual({ score: 42 });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

// ── jsonError ────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a 400 Response by default", async () => {
    const res = jsonError("something went wrong");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "something went wrong" });
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "not found" });
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
