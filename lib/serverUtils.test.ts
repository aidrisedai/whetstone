import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const result = safeParseJson<{ a: number }>('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it("strips markdown json fences", () => {
    const result = safeParseJson<{ x: string }>('```json\n{"x": "hello"}\n```');
    expect(result).toEqual({ x: "hello" });
  });

  it("strips plain code fences", () => {
    const result = safeParseJson<{ n: number }>("```\n{\"n\": 42}\n```");
    expect(result).toEqual({ n: 42 });
  });

  it("strips stray leading and trailing prose by finding braces", () => {
    const result = safeParseJson<{ ok: boolean }>(
      'Here is the result:\n{"ok": true}\nThat is all.',
    );
    expect(result).toEqual({ ok: true });
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 by default", async () => {
    const res = jsonError("something went wrong");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "something went wrong" });
  });

  it("accepts a custom status", async () => {
    const res = jsonError("upstream failure", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "upstream failure" });
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
