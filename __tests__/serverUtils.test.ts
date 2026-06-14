import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../lib/serverUtils";

// ── safeParseJson ────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses clean JSON objects", () => {
    const result = safeParseJson<{ a: number }>('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    const input = '```json\n{"a": 1}\n```';
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const input = '```\n{"a": 1}\n```';
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("extracts JSON when there is leading/trailing prose", () => {
    const input = 'Here is the JSON: {"x": 42} done.';
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 42 });
  });

  it("throws on truly unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles whitespace-only input by throwing", () => {
    expect(() => safeParseJson("   ")).toThrow();
  });

  it("handles empty string by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});

// ── jsonError ─────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a Response with JSON body and correct status", async () => {
    const res = jsonError("Bad request", 400);
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    const body = await res.json();
    expect(body).toEqual({ error: "Bad request" });
  });

  it("defaults to status 400", async () => {
    const res = jsonError("Oops");
    expect(res.status).toBe(400);
  });

  it("accepts custom status codes", async () => {
    const res = jsonError("Unauthorized", 401);
    expect(res.status).toBe(401);
  });
});
