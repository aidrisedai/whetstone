import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "@/lib/builders";

describe("BUILDERS", () => {
  it("contains all four expected keys", () => {
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

  describe("bolt.buildUrl", () => {
    it("encodes the prompt into a bolt.new URL", () => {
      const url = BUILDERS.bolt.buildUrl("build a todo app");
      expect(url).toContain("bolt.new");
      expect(url).toContain(encodeURIComponent("build a todo app"));
    });
  });

  describe("v0.buildUrl", () => {
    it("encodes the prompt into a v0.app URL", () => {
      const url = BUILDERS.v0.buildUrl("make a dashboard");
      expect(url).toContain("v0.app");
      expect(url).toContain(encodeURIComponent("make a dashboard"));
    });
  });

  describe("lovable.buildUrl", () => {
    it("encodes the prompt into a lovable.dev URL", () => {
      const url = BUILDERS.lovable.buildUrl("chat app");
      expect(url).toContain("lovable.dev");
      expect(url).toContain(encodeURIComponent("chat app"));
    });
  });

  describe("claude.buildUrl", () => {
    it("encodes the prompt into a claude.ai URL", () => {
      const url = BUILDERS.claude.buildUrl("help me build");
      expect(url).toContain("claude.ai");
      expect(url).toContain(encodeURIComponent("help me build"));
    });
  });
});

describe("getBuilder", () => {
  it("returns the bolt builder for 'bolt'", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
  });

  it("returns the v0 builder for 'v0'", () => {
    expect(getBuilder("v0").key).toBe("v0");
  });

  it("returns the lovable builder for 'lovable'", () => {
    expect(getBuilder("lovable").key).toBe("lovable");
  });

  it("returns the claude builder for 'claude'", () => {
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for an unknown key", () => {
    expect(getBuilder("unknown_builder").key).toBe("bolt");
  });

  it("falls back to bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("falls back to bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });
});
