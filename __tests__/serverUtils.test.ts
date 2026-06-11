import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError, getErrorMessage } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const result = safeParseJson<{ score: number }>('{"score": 75}');
    expect(result.score).toBe(75);
  });

  it("strips markdown code fences", () => {
    const result = safeParseJson<{ ok: boolean }>("```json\n{\"ok\": true}\n```");
    expect(result.ok).toBe(true);
  });

  it("strips prose before/after the JSON object", () => {
    const result = safeParseJson<{ val: string }>(
      'Here is the JSON: {"val": "hello"} — hope that helps!',
    );
    expect(result.val).toBe("hello");
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });

  it("handles empty string gracefully by throwing", () => {
    expect(() => safeParseJson("")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("bad request");
  });

  it("uses the supplied status code", async () => {
    const res = jsonError("upstream failed", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("getErrorMessage", () => {
  it("handles a plain Error", () => {
    const msg = getErrorMessage(new Error("boom"));
    expect(msg).toBe("boom");
  });

  it("handles a non-Error unknown value", () => {
    const msg = getErrorMessage(42);
    expect(msg).toBe("Something went wrong reaching the advisor.");
  });

  it("handles null", () => {
    const msg = getErrorMessage(null);
    expect(msg).toBe("Something went wrong reaching the advisor.");
  });
});
