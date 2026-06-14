import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "@/lib/serverUtils";
import Anthropic from "@anthropic-ai/sdk";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const obj = safeParseJson<{ a: number }>('{"a":1}');
    expect(obj).toEqual({ a: 1 });
  });

  it("strips json code fences", () => {
    const obj = safeParseJson<{ x: string }>('```json\n{"x":"y"}\n```');
    expect(obj).toEqual({ x: "y" });
  });

  it("strips plain code fences", () => {
    const obj = safeParseJson<{ n: number }>("```\n{\"n\":42}\n```");
    expect(obj).toEqual({ n: 42 });
  });

  it("extracts JSON embedded in prose", () => {
    const text = 'Here is the result: {"score":99} — end.';
    const obj = safeParseJson<{ score: number }>(text);
    expect(obj).toEqual({ score: 99 });
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles null/undefined text gracefully (falls through to throw)", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns auth error message for AuthenticationError", () => {
    const err = new Anthropic.AuthenticationError(401, undefined, "", new Headers());
    expect(getErrorMessage(err)).toContain("ANTHROPIC_API_KEY");
  });

  it("returns rate-limit message for RateLimitError", () => {
    const err = new Anthropic.RateLimitError(429, undefined, "", new Headers());
    expect(getErrorMessage(err)).toContain("rate-limited");
  });

  it("returns generic API error for APIError", () => {
    const err = new Anthropic.APIError(500, undefined, "", new Headers());
    expect(getErrorMessage(err)).toContain("API error");
  });

  it("returns message for plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback for non-Error", () => {
    expect(getErrorMessage("raw string")).toContain("Something went wrong");
    expect(getErrorMessage(42)).toContain("Something went wrong");
  });
});

describe("jsonError", () => {
  it("returns 400 by default with error body", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("respects custom status code", async () => {
    const res = jsonError("server fault", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("x");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
