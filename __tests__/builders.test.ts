import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder, BuilderTarget } from "../lib/builders";

describe("BUILDERS registry", () => {
  it("has all four expected builders", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it("each builder has required fields", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.key).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });
});

describe("getBuilder", () => {
  it("returns bolt for unknown key", () => {
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns bolt for undefined", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns correct builder for each key", () => {
    expect(getBuilder("bolt")).toBe(BUILDERS.bolt);
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});

describe("builder URLs", () => {
  const prompt = "build me a todo app";
  const encoded = encodeURIComponent(prompt);

  it("bolt URL contains encoded prompt", () => {
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain(encoded);
    expect(url).toContain("bolt.new");
  });

  it("v0 URL contains encoded prompt", () => {
    const url = BUILDERS.v0.buildUrl(prompt);
    expect(url).toContain(encoded);
    expect(url).toContain("v0.app");
  });

  it("lovable URL contains encoded prompt", () => {
    const url = BUILDERS.lovable.buildUrl(prompt);
    expect(url).toContain(encoded);
    expect(url).toContain("lovable.dev");
  });

  it("claude URL contains encoded prompt", () => {
    const url = BUILDERS.claude.buildUrl(prompt);
    expect(url).toContain(encoded);
    expect(url).toContain("claude.ai");
  });

  it("encodes special characters in prompt", () => {
    const tricky = "build a app with & and = and spaces";
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl(tricky);
      expect(url).toContain(encodeURIComponent(tricky));
      expect(url).not.toContain(" ");
    }
  });
});
