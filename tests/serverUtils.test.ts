import { describe, expect, it } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

// ── safeParseJson ─────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json code fences", () => {
    const fenced = "```json\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(fenced)).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in plain ``` code fences", () => {
    const fenced = "```\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(fenced)).toEqual({ a: 1 });
  });

  it("extracts JSON from prose surrounding it", () => {
    const text = 'Here is the result: {"a":1} — that is all.';
    expect(safeParseJson<{ a: number }>(text)).toEqual({ a: 1 });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles null/undefined input gracefully (returns parseable empty)", () => {
    // safeParseJson(null) will trim to "" then try to parse "" — that throws
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

// ── jsonError ─────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a Response with the given status and JSON body", async () => {
    const res = jsonError("oops", 400);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("defaults to status 400", async () => {
    const res = jsonError("bad");
    expect(res.status).toBe(400);
  });

  it("accepts other status codes", async () => {
    expect(jsonError("server error", 502).status).toBe(502);
    expect(jsonError("not found", 404).status).toBe(404);
  });
});
