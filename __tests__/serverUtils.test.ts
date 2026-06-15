import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    const result = safeParseJson<{ a: number }>('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    const result = safeParseJson<{ x: string }>('```json\n{"x": "hello"}\n```');
    expect(result).toEqual({ x: "hello" });
  });

  it("strips prose before/after the JSON object", () => {
    const result = safeParseJson<{ v: number }>(
      'Here is the result: {"v": 42} — enjoy.',
    );
    expect(result).toEqual({ v: 42 });
  });

  it("strips code fences without language tag", () => {
    const result = safeParseJson<{ ok: boolean }>("```\n{\"ok\": true}\n```");
    expect(result).toEqual({ ok: true });
  });

  it("throws on truly unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response with the error message by default", async () => {
    const res = jsonError("Bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Bad input" });
  });

  it("uses a custom status code", async () => {
    const res = jsonError("Gateway failure", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "Gateway failure" });
  });
});
