import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "@/lib/serverUtils";

// ── getErrorMessage ──────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("returns message for a plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns the generic fallback for unknown values", () => {
    expect(getErrorMessage("string error")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});

// ── safeParseJson ────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ x: number }>('{"x":1}');
    expect(result).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in a code fence", () => {
    const input = "```json\n{\"score\":85}\n```";
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 85 });
  });

  it("parses JSON wrapped in a bare fence", () => {
    const input = "```\n{\"ok\":true}\n```";
    expect(safeParseJson<{ ok: boolean }>(input)).toEqual({ ok: true });
  });

  it("extracts JSON embedded in surrounding prose", () => {
    const input = 'Here is the result: {"name":"whetstone"} — end';
    expect(safeParseJson<{ name: string }>(input)).toEqual({ name: "whetstone" });
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

// ── jsonError ────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("respects a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "not found" });
  });

  it("sets the correct Content-Type header", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
