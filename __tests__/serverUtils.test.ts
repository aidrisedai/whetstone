import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "@/lib/serverUtils";

describe("getErrorMessage", () => {
  it("returns the error message for a plain Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns a fallback for unknown non-Error values", () => {
    expect(getErrorMessage("string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    const input = "```json\n{\"x\":2}\n```";
    expect(safeParseJson<{ x: number }>(input)).toEqual({ x: 2 });
  });

  it("strips leading prose and trailing text around a JSON object", () => {
    const input = 'Sure, here you go: {"key":"val"} That is all.';
    expect(safeParseJson<{ key: string }>(input)).toEqual({ key: "val" });
  });

  it("throws on completely invalid JSON", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("accepts a custom status code", async () => {
    const res = jsonError("forbidden", 403);
    expect(res.status).toBe(403);
  });
});
