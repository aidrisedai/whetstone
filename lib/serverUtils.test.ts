import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "./serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a ```json code fence", () => {
    const input = "```json\n{\"a\": 1}\n```";
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a plain ``` fence", () => {
    const input = "```\n{\"a\": 1}\n```";
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("extracts JSON embedded in surrounding prose", () => {
    const input = 'Here is your result: {"score": 85} — enjoy!';
    expect(safeParseJson<{ score: number }>(input)).toEqual({ score: 85 });
  });

  it("throws on text with no valid JSON object", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles nested JSON", () => {
    const input = '{"outer": {"inner": 42}}';
    expect(safeParseJson<{ outer: { inner: number } }>(input)).toEqual({ outer: { inner: 42 } });
  });

  it("handles an empty string gracefully (throws)", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns HTTP 400 by default", async () => {
    const res = jsonError("bad input");
    expect(res.status).toBe(400);
  });

  it("body contains the error message", async () => {
    const res = jsonError("bad input");
    const body = await res.json();
    expect(body).toEqual({ error: "bad input" });
  });

  it("respects a custom status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("oops");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("extracts the message from a plain Error", () => {
    expect(getErrorMessage(new Error("something broke"))).toBe("something broke");
  });

  it("returns the fallback for a non-Error unknown value", () => {
    expect(getErrorMessage("raw string")).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });
});
