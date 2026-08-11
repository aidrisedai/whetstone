import { describe, expect, it } from "vitest";
import { jsonError, safeParseJson } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a markdown code fence", () => {
    expect(safeParseJson<{ a: number }>('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("parses JSON surrounded by stray prose", () => {
    expect(safeParseJson<{ a: number }>('Sure, here you go: {"a":1} — hope that helps!')).toEqual({
      a: 1,
    });
  });

  it("throws on genuinely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("builds a JSON Response with the given status and message", async () => {
    const res = jsonError("bad request", 400);
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(await res.json()).toEqual({ error: "bad request" });
  });

  it("defaults to status 400", () => {
    expect(jsonError("oops").status).toBe(400);
  });
});
