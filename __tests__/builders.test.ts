import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../lib/builders";

// ── BUILDERS registry ──────────────────────────────────────────────────────
describe("BUILDERS", () => {
  it("defines bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(expect.arrayContaining(["bolt", "v0", "lovable", "claude"]));
  });

  for (const [key, builder] of Object.entries(BUILDERS)) {
    it(`${key} buildUrl encodes the prompt`, () => {
      const url = builder.buildUrl("my idea & stuff");
      expect(url).toContain(encodeURIComponent("my idea & stuff"));
    });

    it(`${key} buildUrl returns a string starting with https://`, () => {
      expect(builder.buildUrl("test")).toMatch(/^https:\/\//);
    });

    it(`${key} has a non-empty name and tagline`, () => {
      expect(builder.name.length).toBeGreaterThan(0);
      expect(builder.tagline.length).toBeGreaterThan(0);
    });
  }
});

// ── getBuilder ─────────────────────────────────────────────────────────────
describe("getBuilder", () => {
  it("returns the correct builder by key", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("nonexistent").key).toBe("bolt");
  });

  it("falls back to bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("falls back to bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("falls back to bolt for empty string", () => {
    expect(getBuilder("").key).toBe("bolt");
  });
});
