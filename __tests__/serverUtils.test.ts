import { describe, it, expect, vi } from "vitest";

// Mock the Anthropic SDK before importing serverUtils so that error class checks work.
vi.mock("@anthropic-ai/sdk", () => {
  class AuthenticationError extends Error {
    constructor() { super("auth"); }
  }
  class RateLimitError extends Error {
    constructor() { super("rate limit"); }
  }
  class APIError extends Error {
    status?: number;
    constructor(msg: string, status?: number) { super(msg); this.status = status; }
  }
  return {
    default: { AuthenticationError, RateLimitError, APIError },
    AuthenticationError,
    RateLimitError,
    APIError,
  };
});

import { getErrorMessage, safeParseJson, jsonError } from "../lib/serverUtils";
import Anthropic from "@anthropic-ai/sdk";

describe("getErrorMessage", () => {
  it("returns API key message for AuthenticationError", () => {
    // Use Object.create to construct mocked error instances without matching real constructor signatures.
    const err = Object.create(Anthropic.AuthenticationError.prototype) as InstanceType<typeof Anthropic.AuthenticationError>;
    expect(getErrorMessage(err)).toContain("ANTHROPIC_API_KEY");
  });

  it("returns rate-limit message for RateLimitError", () => {
    const err = Object.create(Anthropic.RateLimitError.prototype) as InstanceType<typeof Anthropic.RateLimitError>;
    expect(getErrorMessage(err)).toContain("rate-limited");
  });

  it("returns API error message with status", () => {
    const err = Object.create(Anthropic.APIError.prototype) as InstanceType<typeof Anthropic.APIError>;
    (err as { status?: number }).status = 503;
    const msg = getErrorMessage(err);
    expect(msg).toContain("503");
  });

  it("returns Error.message for plain Error", () => {
    expect(getErrorMessage(new Error("custom msg"))).toBe("custom msg");
  });

  it("returns fallback string for unknown type", () => {
    const msg = getErrorMessage("boom");
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json ... ``` fences", () => {
    const input = '```json\n{"x": 42}\n```';
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 42 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const input = '```\n{"y": "hi"}\n```';
    expect(safeParseJson<{ y: string }>(input)).toEqual({ y: "hi" });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is the data: {"score": 90} and more text.';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 90 });
  });

  it("throws for completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const r = jsonError("bad input");
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBe("bad input");
  });

  it("uses the provided status code", async () => {
    const r = jsonError("upstream failed", 502);
    expect(r.status).toBe(502);
    const body = await r.json();
    expect(body.error).toBe("upstream failed");
  });

  it("sets Content-Type to application/json", () => {
    const r = jsonError("err");
    expect(r.headers.get("content-type")).toBe("application/json");
  });
});
