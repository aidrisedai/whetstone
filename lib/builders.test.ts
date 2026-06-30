import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "./builders";

describe("BUILDERS", () => {
  it("has entries for bolt, v0, lovable, and claude", () => {
    const keys = Object.keys(BUILDERS);
    expect(keys).toContain("bolt");
    expect(keys).toContain("v0");
    expect(keys).toContain("lovable");
    expect(keys).toContain("claude");
  });

  it("each builder has a name, tagline, and buildUrl function", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });
});

describe("getBuilder", () => {
  it("returns the matching builder for a known key", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for an unknown key", () => {
    expect(getBuilder("unknown_xyz").key).toBe("bolt");
  });

  it("falls back to bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("falls back to bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });
});

describe("builder deep links", () => {
  it("bolt URL includes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("build a todo app");
    expect(url).toMatch(/^https:\/\/bolt\.new/);
    expect(url).toContain(encodeURIComponent("build a todo app"));
  });

  it("v0 URL includes the prompt", () => {
    const url = BUILDERS.v0.buildUrl("hello world");
    expect(url).toMatch(/^https:\/\/v0\.app/);
    expect(url).toContain(encodeURIComponent("hello world"));
  });

  it("lovable URL includes the prompt", () => {
    const url = BUILDERS.lovable.buildUrl("my app");
    expect(url).toMatch(/^https:\/\/lovable\.dev/);
    expect(url).toContain(encodeURIComponent("my app"));
  });

  it("claude URL includes the prompt", () => {
    const url = BUILDERS.claude.buildUrl("build it");
    expect(url).toMatch(/^https:\/\/claude\.ai/);
    expect(url).toContain(encodeURIComponent("build it"));
  });
});
