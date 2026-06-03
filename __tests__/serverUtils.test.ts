import { describe, it, expect } from "vitest";
import { safeParseJson } from "@/lib/serverUtils";

describe("safeParseJson", () => {
  it("parses a clean JSON string", () => {
    const result = safeParseJson<{ score: number }>('{"score":72}');
    expect(result.score).toBe(72);
  });

  it("strips ```json fences before parsing", () => {
    const result = safeParseJson<{ ok: boolean }>("```json\n{\"ok\":true}\n```");
    expect(result.ok).toBe(true);
  });

  it("strips plain ``` fences before parsing", () => {
    const result = safeParseJson<{ x: string }>("```\n{\"x\":\"hello\"}\n```");
    expect(result.x).toBe("hello");
  });

  it("extracts the JSON object when surrounded by prose", () => {
    const text = 'Here is your result: {"value":42} — enjoy!';
    const result = safeParseJson<{ value: number }>(text);
    expect(result.value).toBe(42);
  });

  it("handles nested objects", () => {
    const json = '{"outer":{"inner":99}}';
    const result = safeParseJson<{ outer: { inner: number } }>(json);
    expect(result.outer.inner).toBe(99);
  });

  it("handles arrays inside the object", () => {
    const json = '{"items":[1,2,3]}';
    const result = safeParseJson<{ items: number[] }>(json);
    expect(result.items).toEqual([1, 2, 3]);
  });

  it("throws on truly unparseable input", () => {
    expect(() => safeParseJson("not json at all")).toThrow();
  });
});
