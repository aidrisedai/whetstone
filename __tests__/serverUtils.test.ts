import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in a ```json fence", () => {
    expect(safeParseJson<{ x: number }>('```json\n{"x":2}\n```')).toEqual({ x: 2 });
  });

  it("parses JSON wrapped in a plain ``` fence", () => {
    expect(safeParseJson<{ a: string }>('```\n{"a":"hello"}\n```')).toEqual({ a: "hello" });
  });

  it("extracts JSON from surrounding prose", () => {
    const raw = 'Here is the result: {"score":42} end of response.';
    expect(safeParseJson<{ score: number }>(raw)).toEqual({ score: 42 });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response with the error message by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("bad input");
  });

  it("uses a custom status code when provided", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });
});
