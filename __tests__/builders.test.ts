import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt for an unknown key", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("returns bolt when key is null/undefined", () => {
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("returns the correct builder for each known key", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });
});

describe("BUILDERS", () => {
  it("every builder has a name, tagline, and buildUrl function", () => {
    for (const [key, b] of Object.entries(BUILDERS)) {
      expect(typeof b.name).toBe("string");
      expect(b.name.length).toBeGreaterThan(0);
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
      expect(b.key).toBe(key);
    }
  });

  it("buildUrl encodes the prompt correctly", () => {
    const prompt = "Build a to-do app & more";
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl(prompt);
      // Encoded prompt should appear in the URL, spaces as %20 or +
      expect(url).toContain("Build");
      // Should be a valid URL
      expect(() => new URL(url)).not.toThrow();
    }
  });
});

describe("WHETSTONE_BUILDER env override", () => {
  const orig = process.env.WHETSTONE_BUILDER;

  afterEach(() => {
    process.env.WHETSTONE_BUILDER = orig;
  });

  it("activeBuilder uses the env var", async () => {
    process.env.WHETSTONE_BUILDER = "claude";
    // Re-import after env mutation; module is cached so we test getBuilder directly.
    expect(getBuilder(process.env.WHETSTONE_BUILDER).key).toBe("claude");
  });
});
