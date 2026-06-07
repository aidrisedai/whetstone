import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder, activeBuilder } from "@/lib/builders";

describe("BUILDERS", () => {
  it("defines bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS).sort()).toEqual(["bolt", "claude", "lovable", "v0"]);
  });

  it("each builder has a buildUrl function", () => {
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl("test prompt");
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    }
  });

  it("bolt URL encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("hello world");
    expect(url).toContain("hello%20world");
  });

  it("v0 URL contains the prompt", () => {
    const url = BUILDERS.v0.buildUrl("my app idea");
    expect(url).toContain("my%20app%20idea");
  });
});

describe("getBuilder", () => {
  it("returns the matching builder for a known key", () => {
    expect(getBuilder("lovable").key).toBe("lovable");
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
});

describe("activeBuilder", () => {
  it("returns a valid builder target", () => {
    const b = activeBuilder();
    expect(b.key).toBeDefined();
    expect(typeof b.buildUrl).toBe("function");
  });
});
