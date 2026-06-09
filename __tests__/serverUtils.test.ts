import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "@/lib/serverUtils";

// ─── safeParseJson ────────────────────────────────────────────────────────────

describe("safeParseJson", () => {
  it("parses a clean JSON string", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in a ```json fence", () => {
    const input = "```json\n{\"x\":1}\n```";
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in a plain ``` fence", () => {
    const input = "```\n{\"x\":2}\n```";
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 2 });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is the result: {"score":42} — done.';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 42 });
  });

  it("parses nested objects", () => {
    const obj = { a: { b: [1, 2, 3] }, c: "hello" };
    expect(safeParseJson<typeof obj>(JSON.stringify(obj))).toEqual(obj);
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

// ─── getErrorMessage ──────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("returns the message from a plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns a fallback string for non-Error unknown values", () => {
    expect(getErrorMessage("a string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});

// ─── jsonError ────────────────────────────────────────────────────────────────

describe("jsonError", () => {
  it("returns a 400 response with JSON body by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad input");
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("upstream failed");
  });
});
