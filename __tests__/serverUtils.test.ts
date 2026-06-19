import { describe, it, expect } from "vitest";
import { getErrorMessage, safeParseJson } from "@/lib/serverUtils";

describe("getErrorMessage", () => {
  it("extracts message from a plain Error", () => {
    expect(getErrorMessage(new Error("something went wrong"))).toBe("something went wrong");
  });

  it("returns fallback for non-Error values", () => {
    expect(getErrorMessage(null)).toBeTruthy();
    expect(getErrorMessage(42)).toBeTruthy();
    expect(getErrorMessage(undefined)).toBeTruthy();
  });
});

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const result = safeParseJson<{ hello: string }>('{"hello":"world"}');
    expect(result.hello).toBe("world");
  });

  it("parses JSON wrapped in ```json fences", () => {
    const result = safeParseJson<{ n: number }>("```json\n{\"n\":42}\n```");
    expect(result.n).toBe(42);
  });

  it("parses JSON wrapped in plain ``` fences", () => {
    const result = safeParseJson<{ x: boolean }>("```\n{\"x\":true}\n```");
    expect(result.x).toBe(true);
  });

  it("parses JSON with surrounding prose", () => {
    const result = safeParseJson<{ a: string }>("Here is the result:\n{\"a\":\"b\"}\nDone.");
    expect(result.a).toBe("b");
  });

  it("throws on truly unparseable input", () => {
    expect(() => safeParseJson("no json here at all")).toThrow();
  });
});
