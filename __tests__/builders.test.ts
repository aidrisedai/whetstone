import { describe, expect, it } from "vitest";
import { BUILDERS, getBuilder } from "@/lib/builders";

describe("BUILDERS", () => {
  it("includes bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(expect.arrayContaining(["bolt", "v0", "lovable", "claude"]));
  });

  it("each builder has key, name, tagline, and buildUrl", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.key).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });

  it("buildUrl returns a valid URL string", () => {
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl("build me a quiz game");
      expect(() => new URL(url)).not.toThrow();
    }
  });

  it("encodes special characters in the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("a game with & < > characters");
    expect(url).not.toContain(" ");
    expect(() => new URL(url)).not.toThrow();
  });
});

describe("getBuilder", () => {
  it("returns the requested builder by key", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("falls back to bolt for null/undefined", () => {
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
  });
});
