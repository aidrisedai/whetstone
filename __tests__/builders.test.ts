import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt as the default when no key is given", () => {
    expect(getBuilder()).toBe(BUILDERS.bolt);
  });

  it("returns bolt for an unknown key", () => {
    expect(getBuilder("nonexistent")).toBe(BUILDERS.bolt);
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for each valid key", () => {
    for (const key of Object.keys(BUILDERS)) {
      expect(getBuilder(key)).toBe(BUILDERS[key]);
    }
  });
});

describe("BUILDERS buildUrl", () => {
  const prompt = "Build me a to-do app";

  it("bolt.new URL encodes the prompt", () => {
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
});
