import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const result = safeParseJson<{ x: number }>('{"x":1}');
    expect(result).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in a code fence", () => {
    const result = safeParseJson<{ a: string }>('```json\n{"a":"b"}\n```');
    expect(result).toEqual({ a: "b" });
  });

  it("parses JSON wrapped in a plain code fence", () => {
    const result = safeParseJson<{ n: number }>("```\n{\"n\":42}\n```");
    expect(result).toEqual({ n: 42 });
  });

  it("extracts JSON embedded in prose", () => {
    const result = safeParseJson<{ ok: boolean }>(
      'Here is the result: {"ok":true} — done.'
    );
    expect(result).toEqual({ ok: true });
  });

  it("throws on invalid JSON after extraction", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested objects", () => {
    const input = JSON.stringify({ a: { b: { c: 3 } } });
    expect(safeParseJson(input)).toEqual({ a: { b: { c: 3 } } });
  });
});

describe("jsonError", () => {
  it("returns a Response with the given status", async () => {
    const res = jsonError("bad request", 400);
    expect(res.status).toBe(400);
  });

  it("defaults to 400 status", async () => {
    const res = jsonError("bad");
    expect(res.status).toBe(400);
  });

  it("returns JSON content type", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("body contains the error message", async () => {
    const res = jsonError("something went wrong", 502);
    const body = await res.json();
    expect(body).toEqual({ error: "something went wrong" });
  });
});
