import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../lib/builders";

describe("BUILDERS", () => {
  it("contains bolt, v0, lovable, and claude entries", () => {
    expect(Object.keys(BUILDERS)).toEqual(expect.arrayContaining(["bolt", "v0", "lovable", "claude"]));
  });

  it.each(Object.keys(BUILDERS))("%s buildUrl encodes the prompt", (key) => {
    const prompt = "Build a todo app with tags & filters";
    const url = BUILDERS[key].buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("bolt URL points to bolt.new", () => {
    expect(BUILDERS.bolt.buildUrl("test")).toContain("bolt.new");
  });

  it("v0 URL points to v0.app", () => {
    expect(BUILDERS.v0.buildUrl("test")).toContain("v0.app");
  });

  it("lovable URL points to lovable.dev", () => {
    expect(BUILDERS.lovable.buildUrl("test")).toContain("lovable.dev");
  });

  it("claude URL points to claude.ai", () => {
    expect(BUILDERS.claude.buildUrl("test")).toContain("claude.ai");
  });
});

describe("getBuilder", () => {
  it("returns the correct builder for a known key", () => {
    expect(getBuilder("v0").key).toBe("v0");
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
