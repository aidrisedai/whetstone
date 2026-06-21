import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BUILDERS, getBuilder } from "@/lib/builders";

describe("BUILDERS catalog", () => {
  const keys = Object.keys(BUILDERS);

  it("contains at least bolt, v0, lovable, claude", () => {
    expect(keys).toContain("bolt");
    expect(keys).toContain("v0");
    expect(keys).toContain("lovable");
    expect(keys).toContain("claude");
  });

  it("each builder has required fields", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.key).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });

  it("buildUrl returns a URL containing the encoded prompt", () => {
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl("my test prompt");
      expect(url).toContain(encodeURIComponent("my test prompt"));
    }
  });

  it("buildUrl is a valid absolute URL", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(() => new URL(b.buildUrl("test"))).not.toThrow();
    }
  });
});

describe("getBuilder", () => {
  it("returns the bolt builder by default when key is null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns the bolt builder for an unknown key", () => {
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });

  it("returns the matching builder for a valid key", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});
