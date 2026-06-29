import { safeParseJson, jsonError } from "../lib/serverUtils";

describe("safeParseJson", () => {
  it("parses clean JSON", () => {
    expect(safeParseJson<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });

  it("strips markdown json fences", () => {
    expect(safeParseJson<{ x: number }>("```json\n{\"x\":2}\n```")).toEqual({ x: 2 });
  });

  it("strips plain code fences", () => {
    expect(safeParseJson<{ x: number }>("```\n{\"x\":3}\n```")).toEqual({ x: 3 });
  });

  it("extracts JSON from surrounding prose", () => {
    expect(safeParseJson<{ x: number }>('Here is the result: {"x":4} end.')).toEqual({ x: 4 });
  });

  it("throws on unparseable input", () => {
    expect(() => safeParseJson("not json")).toThrow();
  });
});

describe("jsonError", () => {
  it("returns a 400 response by default", async () => {
    const res = jsonError("bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "bad request" });
  });

  it("uses the provided status code", async () => {
    const res = jsonError("upstream error", 502);
    expect(res.status).toBe(502);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonError("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
