import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../lib/serverUtils";

// ── safeParseJson ──────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    const input = '```json\n{"a":1}\n```';
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const input = '```\n{"a":1}\n```';
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("strips leading prose before the opening brace", () => {
    const input = 'Here is the result:\n{"a":1}';
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("strips trailing prose after the closing brace", () => {
    const input = '{"a":1}\nThat is all.';
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles null/undefined input without crashing before JSON.parse", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

// ── jsonError ──────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad request" });
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
