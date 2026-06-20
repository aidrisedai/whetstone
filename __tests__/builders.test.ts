import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "@/lib/builders";

describe("BUILDERS", () => {
  const keys = ["bolt", "v0", "lovable", "claude"] as const;

  it("has exactly bolt, v0, lovable, claude", () => {
    expect(Object.keys(BUILDERS).sort()).toEqual(["bolt", "claude", "lovable", "v0"]);
  });

  for (const key of keys) {
    it(`${key} has key, name, tagline, and buildUrl function`, () => {
      const b = BUILDERS[key];
      expect(b.key).toBe(key);
      expect(typeof b.name).toBe("string");
      expect(b.name.length).toBeGreaterThan(0);
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    });

    it(`${key}.buildUrl encodes the prompt`, () => {
      const prompt = "Build a todo app with dark mode";
      const url = BUILDERS[key].buildUrl(prompt);
      expect(url).toContain("Build%20a%20todo%20app%20with%20dark%20mode");
    });

    it(`${key}.buildUrl returns a valid HTTPS URL`, () => {
      const url = BUILDERS[key].buildUrl("test");
      expect(url).toMatch(/^https:\/\//);
    });
  }
});

describe("getBuilder", () => {
  it("returns the bolt builder by default for unknown keys", () => {
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
    expect(getBuilder("")).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for known keys", () => {
    expect(getBuilder("bolt")).toBe(BUILDERS.bolt);
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});
