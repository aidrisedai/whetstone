import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "@/lib/serverUtils";
import Anthropic from "@anthropic-ai/sdk";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    const fenced = "```json\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(fenced)).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const fenced = "```\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(fenced)).toEqual({ a: 1 });
  });

  it("extracts JSON from surrounding prose", () => {
    const prose = 'Here is the output: {"score":80} end of response.';
    expect(safeParseJson<{ score: number }>(prose)).toEqual({ score: 80 });
  });

  it("handles nested objects", () => {
    const json = '{"clarity":{"score":75,"rationale":"clear"}}';
    expect(safeParseJson<{ clarity: { score: number; rationale: string } }>(json)).toEqual({
      clarity: { score: 75, rationale: "clear" },
    });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles empty-ish input gracefully by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns a friendly message for AuthenticationError", () => {
    const err = new Anthropic.AuthenticationError(401, undefined, "", new Headers());
    const msg = getErrorMessage(err);
    expect(msg).toContain("ANTHROPIC_API_KEY");
  });

  it("returns a friendly message for RateLimitError", () => {
    const err = new Anthropic.RateLimitError(429, undefined, "", new Headers());
    const msg = getErrorMessage(err);
    expect(msg).toContain("rate-limit");
  });

  it("returns a message including status for generic APIError", () => {
    const err = new Anthropic.APIError(503, undefined, "service unavailable", new Headers());
    const msg = getErrorMessage(err);
    expect(msg).toContain("503");
  });

  it("returns the Error.message for a plain Error", () => {
    const err = new Error("something broke");
    expect(getErrorMessage(err)).toBe("something broke");
  });

  it("returns a fallback for unknown error types", () => {
    expect(getErrorMessage("a string error")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("jsonError", () => {
  it("returns a Response with the given message and default 400 status", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("uses the provided status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
