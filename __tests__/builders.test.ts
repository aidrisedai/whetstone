import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

// ── getBuilder ────────────────────────────────────────────────────────────────

describe("getBuilder", () => {
  it("returns bolt for unknown key", () => {
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns bolt for undefined", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for each valid key", () => {
    expect(getBuilder("bolt")).toBe(BUILDERS.bolt);
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});

// ── buildUrl ──────────────────────────────────────────────────────────────────

describe("builder.buildUrl", () => {
  const prompt = "Build a snake game with a high-score board";

  it("bolt URL includes encoded prompt", () => {
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("v0 URL includes encoded prompt", () => {
    const url = BUILDERS.v0.buildUrl(prompt);
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("lovable URL includes encoded prompt", () => {
    const url = BUILDERS.lovable.buildUrl(prompt);
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("claude URL includes encoded prompt", () => {
    const url = BUILDERS.claude.buildUrl(prompt);
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("URL-encodes special characters in the prompt", () => {
    const specialPrompt = "A & B: 50% off, <free>!";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(specialPrompt);
      expect(url).not.toContain(" ");
      expect(url).toContain(encodeURIComponent(specialPrompt));
    }
  });
});
