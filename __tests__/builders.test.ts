import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../lib/builders";

describe("BUILDERS", () => {
  it("defines bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it("each builder has key, name, tagline, and buildUrl function", () => {
    for (const builder of Object.values(BUILDERS)) {
      expect(typeof builder.key).toBe("string");
      expect(typeof builder.name).toBe("string");
      expect(typeof builder.tagline).toBe("string");
      expect(typeof builder.buildUrl).toBe("function");
    }
  });

  it("bolt URL encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("build a todo app");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("build a todo app"));
  });

  it("v0 URL encodes the prompt", () => {
    const url = BUILDERS.v0.buildUrl("make a dashboard");
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent("make a dashboard"));
  });

  it("lovable URL encodes the prompt", () => {
    const url = BUILDERS.lovable.buildUrl("create a game");
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent("create a game"));
  });

  it("claude URL encodes the prompt", () => {
    const url = BUILDERS.claude.buildUrl("write a script");
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent("write a script"));
  });
});

describe("getBuilder", () => {
  it("returns the correct builder for known keys", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for unknown keys", () => {
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
