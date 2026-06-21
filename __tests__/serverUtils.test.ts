import { describe, it, expect } from "vitest";
import { safeParseJson, jsonError } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips a ```json code fence", () => {
    const input = "```json\n{\"a\":1}\n```";
    expect(safeParseJson<{ a: number }>(input)).toEqual({ a: 1 });
  });

  it("strips a ``` code fence with no language", () => {
    const input = "```\n{\"b\":2}\n```";
    expect(safeParseJson<{ b: number }>(input)).toEqual({ b: 2 });
  });

  it("extracts JSON from surrounding prose", () => {
    const input = "Here is the result: {\"ok\":true} — done.";
    expect(safeParseJson<{ ok: boolean }>(input)).toEqual({ ok: true });
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

  it("uses the supplied status code", async () => {
    const res = jsonError("server error", 502);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "server error" });
  });

  it("sets Content-Type: application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
