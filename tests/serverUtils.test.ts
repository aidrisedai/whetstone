import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ score: number }>('{"score": 42}');
    expect(result.score).toBe(42);
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const fenced = "```json\n{\"score\": 42}\n```";
    const result = safeParseJson<{ score: number }>(fenced);
    expect(result.score).toBe(42);
  });

  it("parses JSON surrounded by prose", () => {
    const withProse = 'Here is the result: {"score": 99} and that is it.';
    const result = safeParseJson<{ score: number }>(withProse);
    expect(result.score).toBe(99);
  });

  it("throws SyntaxError on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow(SyntaxError);
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("bad request");
  });

  it("uses the provided status code", async () => {
    const res = jsonError("server error", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("returns the message from a plain Error", () => {
    expect(getErrorMessage(new Error("exploded"))).toBe("exploded");
  });

  it("returns a fallback for non-Error throws", () => {
    expect(getErrorMessage("raw string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });
});
