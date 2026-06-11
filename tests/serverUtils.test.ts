import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON objects", () => {
    expect(safeParseJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    const fenced = "```json\n{\"score\": 80}\n```";
    expect(safeParseJson<{ score: number }>(fenced)).toEqual({ score: 80 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const fenced = "```\n{\"x\": true}\n```";
    expect(safeParseJson<{ x: boolean }>(fenced)).toEqual({ x: true });
  });

  it("extracts the first JSON object from surrounding prose", () => {
    const prose = 'Here is the score: {"overall": 75} — end.';
    expect(safeParseJson<{ overall: number }>(prose)).toEqual({ overall: 75 });
  });

  it("throws SyntaxError for unparseable input", () => {
    expect(() => safeParseJson("not json")).toThrow(SyntaxError);
  });

  it("handles null/undefined text gracefully (treats as empty string)", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

describe("jsonError", () => {
  it("defaults to HTTP 400", async () => {
    const res = jsonError("oops");
    expect(res.status).toBe(400);
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });

  it("returns a JSON body with an error field", async () => {
    const res = jsonError("something broke");
    const body = await res.json();
    expect(body).toEqual({ error: "something broke" });
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("returns the message from a plain Error", () => {
    expect(getErrorMessage(new Error("plain error"))).toBe("plain error");
  });

  it("returns a fallback string for non-Error throws", () => {
    expect(getErrorMessage("string thrown")).toBe(
      "Something went wrong reaching the advisor."
    );
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
