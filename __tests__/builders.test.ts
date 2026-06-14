import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../lib/builders";

// ── BUILDERS ─────────────────────────────────────────────────────────────────

describe("BUILDERS", () => {
  it("has entries for bolt, v0, lovable, claude", () => {
    expect(Object.keys(BUILDERS).sort()).toEqual(["bolt", "claude", "lovable", "v0"]);
  });

  it("each builder has required fields", () => {
    for (const [key, b] of Object.entries(BUILDERS)) {
      expect(b.key).toBe(key);
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });

  it("buildUrl encodes the prompt in the URL for bolt", () => {
    const url = BUILDERS.bolt.buildUrl("build a todo app");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("build a todo app"));
  });

  it("buildUrl encodes the prompt for v0", () => {
    const url = BUILDERS.v0.buildUrl("a chart app");
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent("a chart app"));
  });

  it("buildUrl encodes the prompt for lovable", () => {
    const url = BUILDERS.lovable.buildUrl("a game");
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent("a game"));
  });

  it("buildUrl encodes the prompt for claude", () => {
    const url = BUILDERS.claude.buildUrl("my project");
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent("my project"));
  });

  it("handles special characters in prompts", () => {
    const prompt = "Build an app with <script> & 'quotes'";
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });
});

// ── getBuilder ───────────────────────────────────────────────────────────────

describe("getBuilder", () => {
  it("returns bolt by default for unknown keys", () => {
    expect(getBuilder("unknown")).toEqual(BUILDERS.bolt);
    expect(getBuilder(null)).toEqual(BUILDERS.bolt);
    expect(getBuilder(undefined)).toEqual(BUILDERS.bolt);
    expect(getBuilder("")).toEqual(BUILDERS.bolt);
  });

  it("returns the correct builder for known keys", () => {
    expect(getBuilder("bolt")).toEqual(BUILDERS.bolt);
    expect(getBuilder("v0")).toEqual(BUILDERS.v0);
    expect(getBuilder("lovable")).toEqual(BUILDERS.lovable);
    expect(getBuilder("claude")).toEqual(BUILDERS.claude);
  });
});
