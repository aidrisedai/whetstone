import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "@/lib/serverUtils";
import Anthropic from "@anthropic-ai/sdk";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    expect(safeParseJson<{ x: string }>('```json\n{"x":"hi"}\n```')).toEqual({ x: "hi" });
  });

  it("parses JSON wrapped in bare ``` fences", () => {
    expect(safeParseJson<{ y: boolean }>('```\n{"y":true}\n```')).toEqual({ y: true });
  });

  it("extracts JSON from surrounding prose", () => {
    const text = 'Here is the result: {"score":42} and that is all.';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 42 });
  });

  it("throws on completely unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns auth message for AuthenticationError", () => {
    const err = new Anthropic.AuthenticationError(401, undefined, "bad key", new Headers());
    expect(getErrorMessage(err)).toMatch(/ANTHROPIC_API_KEY/i);
  });

  it("returns rate-limit message for RateLimitError", () => {
    const err = new Anthropic.RateLimitError(429, undefined, "rate limited", new Headers());
    expect(getErrorMessage(err)).toMatch(/rate-limited/i);
  });

  it("returns generic API message for other APIErrors", () => {
    const err = new Anthropic.APIError(500, undefined, "server error", new Headers());
    expect(getErrorMessage(err)).toMatch(/API error/i);
  });

  it("returns the message for plain Errors", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns fallback string for unknown throws", () => {
    expect(getErrorMessage("weird")).toMatch(/something went wrong/i);
    expect(getErrorMessage(null)).toMatch(/something went wrong/i);
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default with JSON body", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    const body = await res.json();
    expect(body).toEqual({ error: "bad request" });
  });

  it("respects a custom status code", async () => {
    const res = jsonError("not found", 404);
    expect(res.status).toBe(404);
  });
});
