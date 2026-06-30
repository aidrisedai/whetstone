import { describe, it, expect } from "vitest";
import { safeParseJson, getErrorMessage, jsonError } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    const input = "```json\n{\"a\": 2}\n```";
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 2 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const input = "```\n{\"b\": 3}\n```";
    expect(safeParseJson<{ b: number }>(input)).toEqual({ b: 3 });
  });

  it("extracts JSON embedded in surrounding prose", () => {
    const input = 'Here is the result:\n{"ok": true}\nThat is all.';
    expect(safeParseJson<{ ok: boolean }>(input)).toEqual({ ok: true });
  });

  it("throws on totally invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("getErrorMessage", () => {
  it("returns message from a plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns fallback for unknown types", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("jsonError", () => {
  it("returns a 400 response with JSON body by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("uses the provided status code", async () => {
    const res = jsonError("upstream failure", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "upstream failure" });
  });
});
