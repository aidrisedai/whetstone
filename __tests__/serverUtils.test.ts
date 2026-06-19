import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON objects", () => {
    const result = safeParseJson<{ score: number }>('{"score":42}');
    expect(result.score).toBe(42);
  });

  it("parses JSON wrapped in ```json fences", () => {
    const fenced = "```json\n{\"score\":55}\n```";
    const result = safeParseJson<{ score: number }>(fenced);
    expect(result.score).toBe(55);
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const fenced = "```\n{\"ok\":true}\n```";
    const result = safeParseJson<{ ok: boolean }>(fenced);
    expect(result.ok).toBe(true);
  });

  it("extracts the object even with leading prose", () => {
    const messy = 'Here is your result:\n{"value": 7}';
    const result = safeParseJson<{ value: number }>(messy);
    expect(result.value).toBe(7);
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a Response with the given message and default 400 status", async () => {
    const resp = jsonError("Bad request");
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe("Bad request");
  });

  it("uses a custom status code when provided", async () => {
    const resp = jsonError("Not found", 404);
    expect(resp.status).toBe(404);
  });

  it("sets Content-Type to application/json", () => {
    const resp = jsonError("oops");
    expect(resp.headers.get("Content-Type")).toBe("application/json");
  });
});
