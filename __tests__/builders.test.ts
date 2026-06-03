import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "@/lib/builders";

describe("BUILDERS", () => {
  it("defines bolt, v0, lovable, and claude targets", () => {
    expect(Object.keys(BUILDERS)).toEqual(expect.arrayContaining(["bolt", "v0", "lovable", "claude"]));
  });

  it("each builder has a key, name, tagline, and buildUrl function", () => {
    for (const target of Object.values(BUILDERS)) {
      expect(typeof target.key).toBe("string");
      expect(typeof target.name).toBe("string");
      expect(typeof target.tagline).toBe("string");
      expect(typeof target.buildUrl).toBe("function");
    }
  });
});

describe("getBuilder", () => {
  it("returns the bolt builder by default", () => {
    expect(getBuilder()).toBe(BUILDERS.bolt);
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });

  it("returns the requested builder by key", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
    expect(getBuilder("bolt")).toBe(BUILDERS.bolt);
  });
});

describe("builder URLs", () => {
  const prompt = "Build a game for kids";

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

  it("handles prompts with special characters", () => {
    const special = "Build a to-do app & score tracker (v2)!";
    const url = BUILDERS.bolt.buildUrl(special);
    expect(url).toContain(encodeURIComponent(special));
    expect(url).not.toContain("&score");
  });

  it("handles empty prompt without throwing", () => {
    expect(() => BUILDERS.bolt.buildUrl("")).not.toThrow();
    expect(() => BUILDERS.v0.buildUrl("")).not.toThrow();
  });
});
