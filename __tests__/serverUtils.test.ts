import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in ```json fences", () => {
    expect(safeParseJson<{ a: number }>("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    expect(safeParseJson<{ a: number }>("```\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("extracts JSON from surrounding prose", () => {
    expect(
      safeParseJson<{ a: number }>('Here is the result: {"a":1} end')
    ).toEqual({ a: 1 });
  });

  it("parses nested objects", () => {
    const result = safeParseJson<{ x: { y: number } }>('{"x":{"y":42}}');
    expect(result.x.y).toBe(42);
  });

  it("throws on text with no JSON object", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a Response with the given status", async () => {
    const res = jsonError("bad request", 400);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad request" });
  });

  it("defaults to status 400", async () => {
    const res = jsonError("oops");
    expect(res.status).toBe(400);
  });

  it("returns status 500 when specified", async () => {
    const res = jsonError("server error", 500);
    expect(res.status).toBe(500);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("test");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("extracts the message from a plain Error", () => {
    expect(getErrorMessage(new Error("something broke"))).toBe("something broke");
  });

  it("returns the fallback message for a string", () => {
    expect(getErrorMessage("a string")).toBe(
      "Something went wrong reaching the advisor."
    );
  });

  it("returns the fallback message for null", () => {
    expect(getErrorMessage(null)).toBe(
      "Something went wrong reaching the advisor."
    );
  });

  it("returns the fallback message for a number", () => {
    expect(getErrorMessage(42)).toBe(
      "Something went wrong reaching the advisor."
    );
  });
});
