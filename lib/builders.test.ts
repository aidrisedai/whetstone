import { describe, expect, it } from "vitest";
import { BUILDERS, getBuilder } from "./builders";

describe("getBuilder", () => {
  it("returns the requested builder by key", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
  });

  it("falls back to bolt for an unknown, null, or missing key", () => {
    expect(getBuilder("nonexistent")).toBe(BUILDERS.bolt);
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
    expect(getBuilder("")).toBe(BUILDERS.bolt);
  });

  it("falls back to bolt for inherited Object properties", () => {
    // A bare `BUILDERS[key]` lookup finds these on the prototype: each is
    // truthy but has no buildUrl, so /api/export crashed with a TypeError on
    // a mistyped WHETSTONE_BUILDER instead of falling back.
    for (const key of ["constructor", "toString", "hasOwnProperty", "__proto__", "valueOf"]) {
      const builder = getBuilder(key);
      expect(builder).toBe(BUILDERS.bolt);
      expect(typeof builder.buildUrl).toBe("function");
      expect(() => builder.buildUrl("a prompt")).not.toThrow();
    }
  });
});

describe("BUILDERS.buildUrl", () => {
  it("URL-encodes the prompt for every builder", () => {
    const prompt = "build a & test app";
    for (const builder of Object.values(BUILDERS)) {
      expect(builder.buildUrl(prompt)).toContain(encodeURIComponent(prompt));
    }
  });
});
