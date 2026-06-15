import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ score: number }>('{"score":85}');
    expect(result).toEqual({ score: 85 });
  });

  it("strips markdown code fences", () => {
    const text = "```json\n{\"score\":42}\n```";
    expect(safeParseJson<{ score: number }>(text)).toEqual({ score: 42 });
  });

  it("strips prose surrounding a JSON object", () => {
    const text = 'Here is the result: {"title":"ok"} and nothing else';
    expect(safeParseJson<{ title: string }>(text)).toEqual({ title: "ok" });
  });

  it("handles nested objects", () => {
    const json = '{"clarity":{"score":80,"rationale":"r","suggestion":"s"}}';
    const result = safeParseJson<{ clarity: { score: number } }>(json);
    expect(result.clarity.score).toBe(80);
  });

  it("throws on completely unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("respects a custom status code", async () => {
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("upstream error");
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("test");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
