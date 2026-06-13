import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "@/lib/builders";

describe("BUILDERS catalog", () => {
  it("contains bolt, v0, lovable, claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(expect.arrayContaining(["bolt", "v0", "lovable", "claude"]));
  });

  it("each builder has key, name, tagline, and buildUrl", () => {
    for (const [key, b] of Object.entries(BUILDERS)) {
      expect(b.key).toBe(key);
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });

  it("buildUrl encodes the prompt into a URL", () => {
    const prompt = "Build a task manager for students";
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });
});

describe("getBuilder", () => {
  it("returns the matching builder by key", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown_key").key).toBe("bolt");
  });

  it("falls back to bolt for null or undefined", () => {
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
  });
});
