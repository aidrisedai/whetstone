import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../lib/builders";

describe("BUILDERS", () => {
  it("contains all four expected keys", () => {
    expect(Object.keys(BUILDERS).sort()).toEqual(["bolt", "claude", "lovable", "v0"]);
  });

  it("each builder has a non-empty name and tagline", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.tagline.length).toBeGreaterThan(0);
    }
  });

  it("buildUrl encodes the prompt and produces a valid-looking URL", () => {
    const prompt = "Build a todo app with user login";
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl(prompt);
      expect(url).toMatch(/^https:\/\//);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });
});

describe("getBuilder", () => {
  it("returns bolt as the default for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("returns bolt as the default for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("returns bolt as the default for an unknown key", () => {
    expect(getBuilder("unknown-builder").key).toBe("bolt");
  });

  it("returns the correct builder for each known key", () => {
    for (const key of ["bolt", "v0", "lovable", "claude"] as const) {
      expect(getBuilder(key).key).toBe(key);
    }
  });

  it("bolt URL uses bolt.new domain", () => {
    const url = BUILDERS.bolt.buildUrl("hello");
    expect(url).toContain("bolt.new");
  });

  it("v0 URL uses v0.app domain", () => {
    const url = BUILDERS.v0.buildUrl("hello");
    expect(url).toContain("v0.app");
  });

  it("lovable URL uses lovable.dev domain", () => {
    const url = BUILDERS.lovable.buildUrl("hello");
    expect(url).toContain("lovable.dev");
  });

  it("claude URL uses claude.ai domain", () => {
    const url = BUILDERS.claude.buildUrl("hello");
    expect(url).toContain("claude.ai");
  });

  it("handles prompts with special characters correctly", () => {
    const prompt = "Build an app: tasks & reminders (free)";
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl(prompt);
      expect(() => new URL(url)).not.toThrow();
    }
  });
});
