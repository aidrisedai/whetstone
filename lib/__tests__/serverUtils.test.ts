import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../serverUtils";

// ── safeParseJson ─────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x": 1}')).toEqual({ x: 1 });
  });

  it("strips leading markdown code fence", () => {
    expect(safeParseJson<{ x: number }>("```json\n{\"x\": 2}\n```")).toEqual({ x: 2 });
  });

  it("strips bare code fence", () => {
    expect(safeParseJson<{ x: number }>("```\n{\"x\": 3}\n```")).toEqual({ x: 3 });
  });

  it("extracts JSON from surrounding prose", () => {
    const text = 'Here is your result:\n{"score": 88}\nThat\'s the answer.';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 88 });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles null/undefined input gracefully (falls back to empty string → throws)", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

// ── jsonError ─────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a Response with JSON body and default 400 status", async () => {
    const res = jsonError("something went wrong");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "something went wrong" });
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("not found");
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toContain("application/json");
  });
});
