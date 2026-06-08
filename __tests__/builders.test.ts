import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BUILDERS, getBuilder, BuilderTarget } from "@/lib/builders";

describe("BUILDERS", () => {
  it("has entries for bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toContain("bolt");
    expect(Object.keys(BUILDERS)).toContain("v0");
    expect(Object.keys(BUILDERS)).toContain("lovable");
    expect(Object.keys(BUILDERS)).toContain("claude");
  });

  it("each builder has required fields", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.key).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });

  it("bolt buildUrl encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("hello world");
    expect(url).toContain("hello%20world");
    expect(url).toContain("bolt.new");
  });

  it("v0 buildUrl encodes the prompt", () => {
    const url = BUILDERS.v0.buildUrl("my app");
    expect(url).toContain("my%20app");
    expect(url).toContain("v0.app");
  });

  it("lovable buildUrl encodes the prompt", () => {
    const url = BUILDERS.lovable.buildUrl("cool app");
    expect(url).toContain("cool%20app");
    expect(url).toContain("lovable.dev");
  });

  it("claude buildUrl encodes the prompt", () => {
    const url = BUILDERS.claude.buildUrl("my idea");
    expect(url).toContain("my%20idea");
    expect(url).toContain("claude.ai");
  });

  it("buildUrl handles special characters", () => {
    const prompt = "build a game with & symbols < > \"quotes\"";
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl(prompt);
      expect(url).not.toContain(" ");
      expect(url).toContain(b.key === "v0" ? "v0.app" : b.key === "claude" ? "claude.ai" : b.key);
    }
  });
});

describe("getBuilder", () => {
  it("returns the requested builder by key", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
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

  it("falls back to bolt for empty string", () => {
    expect(getBuilder("").key).toBe("bolt");
  });
});
