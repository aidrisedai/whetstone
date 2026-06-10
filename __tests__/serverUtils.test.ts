import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips markdown json fences", () => {
    const input = "```json\n{\"score\": 80}\n```";
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 80 });
  });

  it("strips generic backtick fences", () => {
    const input = "```\n{\"ok\": true}\n```";
    expect(safeParseJson<{ ok: boolean }>(input)).toEqual({ ok: true });
  });

  it("extracts JSON from prose wrapping", () => {
    const input = 'Here is the result: {"value": 42} end.';
    expect(safeParseJson<{ value: number }>(input)).toEqual({ value: 42 });
  });

  it("throws for non-parseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad request");
  });

  it("uses the provided status code", async () => {
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
  });
});

describe("getErrorMessage", () => {
  it("returns a string for a plain Error", () => {
    const msg = getErrorMessage(new Error("something broke"));
    expect(msg).toContain("something broke");
  });

  it("returns a fallback for non-Error values", () => {
    const msg = getErrorMessage("a string");
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("returns a fallback for null", () => {
    const msg = getErrorMessage(null);
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });
});
