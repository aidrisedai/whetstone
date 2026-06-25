import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "../serverUtils";

// Import Anthropic for class-based error checking
import Anthropic from "@anthropic-ai/sdk";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in code fences", () => {
    const text = '```json\n{"x":1}\n```';
    expect(safeParseJson<{ x: number }>(text)).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in bare code fences", () => {
    const text = "```\n{\"a\":\"b\"}\n```";
    expect(safeParseJson<{ a: string }>(text)).toEqual({ a: "b" });
  });

  it("strips leading prose before the JSON object", () => {
    const text = 'Here is the result: {"score":99}';
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 99 });
  });

  it("handles whitespace/newlines around the object", () => {
    expect(safeParseJson<{ y: boolean }>('\n\n  {"y":true}  \n\n')).toEqual({ y: true });
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles null/undefined gracefully by throwing", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a Response with the given message and 400 by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("respects a custom status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("upstream failed");
  });
});

describe("getErrorMessage", () => {
  it("handles a plain Error", () => {
    expect(getErrorMessage(new Error("something broke"))).toBe("something broke");
  });

  it("returns a fallback for non-Error values", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });

  it("returns auth message for AuthenticationError", () => {
    const headers = new Headers();
    const err = new Anthropic.AuthenticationError(401, {} as never, "", headers);
    expect(getErrorMessage(err)).toContain("ANTHROPIC_API_KEY");
  });

  it("returns rate-limit message for RateLimitError", () => {
    const headers = new Headers();
    const err = new Anthropic.RateLimitError(429, {} as never, "", headers);
    expect(getErrorMessage(err)).toContain("rate-limited");
  });
});
