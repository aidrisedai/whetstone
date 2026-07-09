import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { getErrorMessage, jsonError, safeParseJson } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a markdown code fence", () => {
    expect(safeParseJson<{ a: number }>('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("extracts JSON surrounded by stray prose", () => {
    expect(safeParseJson<{ a: number }>('Here you go: {"a":1} — hope that helps')).toEqual({ a: 1 });
  });
});

describe("jsonError", () => {
  it("builds a JSON response with the given status and message", async () => {
    const res = jsonError("bad request", 400);
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(await res.json()).toEqual({ error: "bad request" });
  });

  it("defaults to a 400 status", () => {
    expect(jsonError("oops").status).toBe(400);
  });
});

describe("getErrorMessage", () => {
  it("gives a plain Error's message", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("gives a generic fallback for a non-Error value", () => {
    expect(getErrorMessage("not an error")).toBe("Something went wrong reaching the advisor.");
  });

  it("gives a friendly message for an Anthropic AuthenticationError", () => {
    const err = new Anthropic.AuthenticationError(401, {}, "unauthorized", new Headers());
    expect(getErrorMessage(err)).toContain("ANTHROPIC_API_KEY");
  });

  it("gives a friendly message for an Anthropic RateLimitError", () => {
    const err = new Anthropic.RateLimitError(429, {}, "rate limited", new Headers());
    expect(getErrorMessage(err)).toContain("rate-limited");
  });
});
