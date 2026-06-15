import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "@/lib/builders";

// ─── BUILDERS ─────────────────────────────────────────────────────────────────

describe("BUILDERS", () => {
  const keys = ["bolt", "v0", "lovable", "claude"] as const;

  it("defines all expected builder targets", () => {
    for (const key of keys) {
      expect(BUILDERS[key]).toBeDefined();
    }
  });

  it("each builder has a key, name, tagline, and buildUrl function", () => {
    for (const key of keys) {
      const b = BUILDERS[key];
      expect(typeof b.key).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });

  it("buildUrl produces a URL containing the encoded prompt", () => {
    const prompt = "Build a quiz app for 10-year-olds";
    for (const key of keys) {
      const url = BUILDERS[key].buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });

  it("bolt buildUrl uses bolt.new domain", () => {
    expect(BUILDERS.bolt.buildUrl("test")).toContain("bolt.new");
  });

  it("v0 buildUrl uses v0.app domain", () => {
    expect(BUILDERS.v0.buildUrl("test")).toContain("v0.app");
  });

  it("lovable buildUrl uses lovable.dev domain", () => {
    expect(BUILDERS.lovable.buildUrl("test")).toContain("lovable.dev");
  });

  it("claude buildUrl uses claude.ai domain", () => {
    expect(BUILDERS.claude.buildUrl("test")).toContain("claude.ai");
  });
});

// ─── getBuilder ───────────────────────────────────────────────────────────────

describe("getBuilder", () => {
  it("returns the correct builder for a known key", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for an unknown key", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("falls back to bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("falls back to bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("falls back to bolt for an empty string", () => {
    expect(getBuilder("").key).toBe("bolt");
  });
});
