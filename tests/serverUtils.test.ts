import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses a plain JSON object", () => {
    const result = safeParseJson<{ a: number }>('{"a":1}');
    expect(result.a).toBe(1);
  });

  it("parses JSON wrapped in ```json fences", () => {
    const input = "```json\n{\"x\":42}\n```";
    expect(safeParseJson<{ x: number }>(input).x).toBe(42);
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const input = "```\n{\"y\":\"hello\"}\n```";
    expect(safeParseJson<{ y: string }>(input).y).toBe("hello");
  });

  it("extracts JSON from surrounding prose", () => {
    const input = 'Here is your result: {"score":80} — done.';
    expect(safeParseJson<{ score: number }>(input).score).toBe(80);
  });

  it("throws on truly invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("uses the provided status code", async () => {
    const res = jsonError("upstream failure", 502);
    expect(res.status).toBe(502);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("upstream failure");
  });
});
