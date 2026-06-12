import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder, activeBuilder } from "../lib/builders";

describe("BUILDERS", () => {
  it("defines bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS).sort()).toEqual(["bolt", "claude", "lovable", "v0"]);
  });

  it("each builder has a key, name, tagline, and buildUrl function", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.key).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });

  it("buildUrl encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("my app idea & more");
    expect(url).toContain(encodeURIComponent("my app idea & more"));
  });

  it("v0 buildUrl is a valid URL", () => {
    const url = BUILDERS.v0.buildUrl("test");
    expect(() => new URL(url)).not.toThrow();
  });

  it("lovable buildUrl is a valid URL", () => {
    const url = BUILDERS.lovable.buildUrl("test");
    expect(() => new URL(url)).not.toThrow();
  });

  it("claude buildUrl is a valid URL", () => {
    const url = BUILDERS.claude.buildUrl("test");
    expect(() => new URL(url)).not.toThrow();
  });
});

describe("getBuilder", () => {
  it("returns bolt for an unknown key", () => {
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns bolt for undefined", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for a known key", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});

describe("activeBuilder", () => {
  it("returns a valid BuilderTarget", () => {
    const b = activeBuilder();
    expect(typeof b.key).toBe("string");
    expect(typeof b.buildUrl).toBe("function");
  });
});
