import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const result = safeParseJson<{ foo: string }>('{"foo":"bar"}');
    expect(result.foo).toBe("bar");
  });

  it("strips json code fences", () => {
    const result = safeParseJson<{ a: number }>("```json\n{\"a\":1}\n```");
    expect(result.a).toBe(1);
  });

  it("strips plain code fences", () => {
    const result = safeParseJson<{ x: boolean }>("```\n{\"x\":true}\n```");
    expect(result.x).toBe(true);
  });

  it("handles leading prose before the JSON object", () => {
    const result = safeParseJson<{ ok: boolean }>("Here is the JSON: {\"ok\":true} that is it.");
    expect(result.ok).toBe(true);
  });

  it("throws on completely invalid input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a Response with the correct status", async () => {
    const r = jsonError("bad request");
    expect(r.status).toBe(400);
  });

  it("includes the error message in the body", async () => {
    const r = jsonError("something broke", 502);
    const body = (await r.json()) as { error: string };
    expect(body.error).toBe("something broke");
  });

  it("uses the provided status code", () => {
    expect(jsonError("x", 502).status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const r = jsonError("err");
    expect(r.headers.get("Content-Type")).toBe("application/json");
  });
});
