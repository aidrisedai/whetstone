import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson, jsonError } from "@/lib/serverUtils";

describe("getErrorMessage", () => {
  it("returns message for generic Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it("returns fallback for unknown type", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong reaching the advisor.");
  });

  it("handles null", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong reaching the advisor.");
  });

  it("handles string", () => {
    expect(getErrorMessage("nope")).toBe("Something went wrong reaching the advisor.");
  });
});

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips leading/trailing prose", () => {
    const raw = 'Here is your result: {"score":90} — done!';
    expect(safeParseJson<{ score: number }>(raw)).toEqual({ score: 90 });
  });

  it("handles fenced code blocks", () => {
    const raw = "```json\n{\"ok\":true}\n```";
    expect(safeParseJson<{ ok: boolean }>(raw)).toEqual({ ok: true });
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParseJson("{bad}")).toThrow();
  });

  it("handles null input gracefully", () => {
    expect(() => safeParseJson(null as unknown as string)).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const r = jsonError("bad request");
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body).toEqual({ error: "bad request" });
  });

  it("respects custom status code", async () => {
    const r = jsonError("server error", 502);
    expect(r.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const r = jsonError("oops");
    expect(r.headers.get("Content-Type")).toBe("application/json");
  });
});
