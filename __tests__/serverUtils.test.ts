import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock must be declared before importing the module under test.
vi.mock("@anthropic-ai/sdk", () => {
  class AuthenticationError extends Error {
    constructor() {
      super("authentication failed");
      this.name = "AuthenticationError";
    }
  }
  class RateLimitError extends Error {
    constructor() {
      super("rate limited");
      this.name = "RateLimitError";
    }
  }
  class APIError extends Error {
    status?: number;
    constructor(status?: number) {
      super(`api error ${status}`);
      this.name = "APIError";
      this.status = status;
    }
  }
  function AnthropicClient() {}
  (AnthropicClient as unknown as Record<string, unknown>).AuthenticationError = AuthenticationError;
  (AnthropicClient as unknown as Record<string, unknown>).RateLimitError = RateLimitError;
  (AnthropicClient as unknown as Record<string, unknown>).APIError = APIError;
  return { default: AnthropicClient };
});

import { safeParseJson, jsonError, getErrorMessage } from "../lib/serverUtils";
import Anthropic from "@anthropic-ai/sdk";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ x: number }>('{"x":1}');
    expect(result).toEqual({ x: 1 });
  });

  it("strips markdown JSON code fences", () => {
    const fenced = "```json\n{\"x\":1}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 1 });
  });

  it("strips generic code fences", () => {
    const fenced = "```\n{\"x\":1}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 1 });
  });

  it("extracts JSON from surrounding prose", () => {
    const prose = "Here is the result: {\"score\":42} as requested.";
    expect(safeParseJson<{ score: number }>(prose)).toEqual({ score: 42 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });

  it("handles empty string by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
  });

  it("handles null/undefined input gracefully by throwing", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a Response with the correct status", async () => {
    const res = jsonError("something went wrong", 422);
    expect(res.status).toBe(422);
  });

  it("defaults to status 400", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
  });

  it("body contains the error message", async () => {
    const res = jsonError("oops");
    const body = await res.json();
    expect(body).toEqual({ error: "oops" });
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  beforeAll(() => {
    // Confirm the mock is active
    expect(typeof (Anthropic as unknown as Record<string, unknown>).AuthenticationError).toBe("function");
  });

  it("returns auth message for AuthenticationError", () => {
    const AuthErr = (Anthropic as unknown as Record<string, new () => Error>).AuthenticationError;
    const msg = getErrorMessage(new AuthErr());
    expect(msg).toMatch(/ANTHROPIC_API_KEY/i);
  });

  it("returns rate-limit message for RateLimitError", () => {
    const RateLimitErr = (Anthropic as unknown as Record<string, new () => Error>).RateLimitError;
    const msg = getErrorMessage(new RateLimitErr());
    expect(msg).toMatch(/rate.limit/i);
  });

  it("returns API error message with status for APIError", () => {
    const APIErr = (Anthropic as unknown as { APIError: new (s?: number) => Error }).APIError;
    const msg = getErrorMessage(new APIErr(503));
    expect(msg).toMatch(/503/);
  });

  it("returns APIError message with '?' for missing status", () => {
    const APIErr = (Anthropic as unknown as { APIError: new (s?: number) => Error }).APIError;
    const msg = getErrorMessage(new APIErr(undefined));
    expect(msg).toMatch(/\?/);
  });

  it("returns the message property of a plain Error", () => {
    expect(getErrorMessage(new Error("custom error"))).toBe("custom error");
  });

  it("returns fallback string for unknown types", () => {
    expect(getErrorMessage("some string")).toMatch(/something went wrong/i);
    expect(getErrorMessage(null)).toMatch(/something went wrong/i);
    expect(getErrorMessage(42)).toMatch(/something went wrong/i);
  });
});
