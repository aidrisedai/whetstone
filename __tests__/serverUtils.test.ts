import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ score: number }>('{"score": 75}');
    expect(result.score).toBe(75);
  });

  it("parses JSON wrapped in a ```json ... ``` fence", () => {
    const fenced = '```json\n{"score": 75}\n```';
    const result = safeParseJson<{ score: number }>(fenced);
    expect(result.score).toBe(75);
  });

  it("parses JSON wrapped in a plain ``` ... ``` fence", () => {
    const fenced = '```\n{"score": 75}\n```';
    const result = safeParseJson<{ score: number }>(fenced);
    expect(result.score).toBe(75);
  });

  it("extracts JSON from surrounding prose", () => {
    const text = 'Here is the result: {"score": 75} — end.';
    const result = safeParseJson<{ score: number }>(text);
    expect(result.score).toBe(75);
  });

  it("parses nested objects", () => {
    const result = safeParseJson<{ clarity: { score: number } }>(
      '{"clarity": {"score": 80}}'
    );
    expect(result.clarity.score).toBe(80);
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response with the error message by default", async () => {
    const res = jsonError("Something went wrong");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Something went wrong");
  });

  it("respects a custom status code", async () => {
    const res = jsonError("Not found", 404);
    expect(res.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
