import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../lib/builders";

describe("BUILDERS", () => {
  it("contains bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it("each builder has a key, name, tagline, and buildUrl function", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.key).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });
});

describe("buildUrl", () => {
  const prompt = "Build a todo app with React";

  it("bolt URL encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("v0 URL encodes the prompt", () => {
    const url = BUILDERS.v0.buildUrl(prompt);
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("lovable URL encodes the prompt", () => {
    const url = BUILDERS.lovable.buildUrl(prompt);
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("claude URL encodes the prompt", () => {
    const url = BUILDERS.claude.buildUrl(prompt);
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("handles special characters in the prompt", () => {
    const special = "Build a & share <ideas> quickly!";
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl(special);
      expect(url).not.toContain(" ");
      expect(url).toContain(encodeURIComponent(special));
    }
  });
});

describe("getBuilder", () => {
  it("returns bolt by default", () => {
    expect(getBuilder()).toEqual(BUILDERS.bolt);
    expect(getBuilder(null)).toEqual(BUILDERS.bolt);
    expect(getBuilder("")).toEqual(BUILDERS.bolt);
  });

  it("returns the requested builder", () => {
    expect(getBuilder("v0")).toEqual(BUILDERS.v0);
    expect(getBuilder("lovable")).toEqual(BUILDERS.lovable);
    expect(getBuilder("claude")).toEqual(BUILDERS.claude);
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown_builder")).toEqual(BUILDERS.bolt);
  });
});
