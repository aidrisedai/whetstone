import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "../serverUtils";
import { APIError, RateLimitError, AuthenticationError } from "@anthropic-ai/sdk";

describe("safeParseJson", () => {
  it("parses plain JSON objects", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in code fences", () => {
    const fenced = "```json\n{\"key\":\"value\"}\n```";
    expect(safeParseJson<{ key: string }>(fenced)).toEqual({ key: "value" });
  });

  it("parses JSON wrapped in bare code fences", () => {
    const fenced = "```\n{\"x\":42}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 42 });
  });

  it("parses JSON surrounded by prose", () => {
    const dirty = 'Here is the result: {"score":75} done.';
    expect(safeParseJson<{ score: number }>(dirty)).toEqual({ score: 75 });
  });

  it("throws for truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a Response with the given message", async () => {
    const res = jsonError("Something broke");
    const body = await res.json();
    expect(body.error).toBe("Something broke");
  });

  it("defaults to status 400", () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
  });

  it("accepts a custom status code", () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("x");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

const fakeHeaders = new Headers({ "content-type": "application/json" });

describe("getErrorMessage", () => {
  it("returns a user-friendly message for AuthenticationError", () => {
    const err = new AuthenticationError(401, { error: { type: "authentication_error", message: "Invalid API key" } }, "Invalid API key", fakeHeaders);
    expect(getErrorMessage(err)).toContain("authenticate");
  });

  it("returns a user-friendly message for RateLimitError", () => {
    const err = new RateLimitError(429, { error: { type: "rate_limit_error", message: "Too many requests" } }, "Rate limit", fakeHeaders);
    expect(getErrorMessage(err)).toContain("rate-limited");
  });

  it("returns a user-friendly message for generic APIError", () => {
    const err = new APIError(500, { error: { type: "api_error", message: "Server error" } }, "Internal server error", fakeHeaders);
    expect(getErrorMessage(err)).toContain("API error");
  });

  it("returns the message for plain Error", () => {
    expect(getErrorMessage(new Error("disk full"))).toBe("disk full");
  });

  it("returns a fallback for unknown error types", () => {
    expect(getErrorMessage("some string error")).toContain("Something went wrong");
    expect(getErrorMessage(null)).toContain("Something went wrong");
  });
});
