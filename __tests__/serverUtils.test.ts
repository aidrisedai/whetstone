import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses a clean JSON string", () => {
    const result = safeParseJson<{ value: number }>('{"value": 42}');
    expect(result).toEqual({ value: 42 });
  });

  it("parses JSON wrapped in a markdown code fence", () => {
    const fenced = '```json\n{"key":"val"}\n```';
    expect(safeParseJson<{ key: string }>(fenced)).toEqual({ key: "val" });
  });

  it("parses JSON wrapped in a generic code fence", () => {
    const fenced = '```\n{"key":"val"}\n```';
    expect(safeParseJson<{ key: string }>(fenced)).toEqual({ key: "val" });
  });

  it("extracts JSON object from surrounding prose", () => {
    const messy = 'Here is the output: {"score": 95} (end of output)';
    expect(safeParseJson<{ score: number }>(messy)).toEqual({ score: 95 });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles empty string by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
  });

  it("handles null/undefined by throwing", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a Response with the given status and error message", async () => {
    const res = jsonError("something went wrong", 422);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toEqual({ error: "something went wrong" });
  });

  it("defaults to status 400", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("error");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
