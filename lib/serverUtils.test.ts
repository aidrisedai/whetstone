import { describe, it, expect, vi } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "./serverUtils";

// ── safeParseJson ─────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses a clean JSON object", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips a ```json ... ``` code fence", () => {
    const fenced = "```json\n{\"x\": 42}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 42 });
  });

  it("strips a plain ``` ... ``` code fence", () => {
    const fenced = "```\n{\"y\": true}\n```";
    expect(safeParseJson<{ y: boolean }>(fenced)).toEqual({ y: true });
  });

  it("ignores leading/trailing prose when the JSON object is extractable", () => {
    const withProse = 'Here is the JSON: {"score": 80} — end.';
    expect(safeParseJson<{ score: number }>(withProse)).toEqual({ score: 80 });
  });

  it("throws on malformed JSON", () => {
    expect(() => safeParseJson("{bad json}")).toThrow();
  });

  it("handles an empty string by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});

// ── jsonError ─────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a Response with the given status and JSON body", async () => {
    const res = jsonError("Something broke", 400);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Something broke");
  });

  it("defaults to status 400", async () => {
    const res = jsonError("oops");
    expect(res.status).toBe(400);
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("gateway error", 502);
    expect(res.status).toBe(502);
  });
});

// ── getErrorMessage ───────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("returns the message from a plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a fallback string for non-Error values", () => {
    expect(getErrorMessage("raw string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});
