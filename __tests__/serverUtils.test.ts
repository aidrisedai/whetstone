import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x": 1}')).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in a ```json code fence", () => {
    const fenced = "```json\n{\"x\": 2}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 2 });
  });

  it("parses JSON wrapped in plain ``` fence", () => {
    const fenced = "```\n{\"x\": 3}\n```";
    expect(safeParseJson<{ x: number }>(fenced)).toEqual({ x: 3 });
  });

  it("extracts JSON object from surrounding prose", () => {
    const prose = "Here is the result: {\"score\": 42} — done!";
    expect(safeParseJson<{ score: number }>(prose)).toEqual({ score: 42 });
  });

  it("handles nested objects", () => {
    const input = '{"a": {"b": [1,2,3]}}';
    expect(safeParseJson<{ a: { b: number[] } }>(input)).toEqual({ a: { b: [1, 2, 3] } });
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles null/empty input gracefully (throws)", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a Response with the correct status and JSON body", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad request");
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("upstream error");
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("x");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
