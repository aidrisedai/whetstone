import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in code fences", () => {
    const input = "```json\n{\"a\":2}\n```";
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 2 });
  });

  it("parses JSON wrapped in plain code fences", () => {
    const input = "```\n{\"a\":3}\n```";
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 3 });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is the result: {"x":"hello"} done.';
    expect(safeParseJson<{ x: string }>(input)).toEqual({ x: "hello" });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a Response with default 400 status", async () => {
    const res = jsonError("oops");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "oops" });
  });

  it("respects a custom status", async () => {
    const res = jsonError("server fail", 502);
    expect(res.status).toBe(502);
  });
});
