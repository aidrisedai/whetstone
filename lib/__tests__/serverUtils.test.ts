import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "../serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const result = safeParseJson<{ x: number }>('{"x":1}');
    expect(result).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    const result = safeParseJson<{ x: number }>('```json\n{"x":1}\n```');
    expect(result).toEqual({ x: 1 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const result = safeParseJson<{ x: number }>('```\n{"x":1}\n```');
    expect(result).toEqual({ x: 1 });
  });

  it("extracts JSON when surrounded by stray prose", () => {
    const result = safeParseJson<{ x: number }>('Here is the result:\n{"x":42}\nDone.');
    expect(result).toEqual({ x: 42 });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad request");
  });

  it("returns the specified status code", async () => {
    const res = jsonError("server error", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("test");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
