import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt by default when no key given", () => {
    expect(getBuilder()).toBe(BUILDERS.bolt);
  });

  it("returns bolt for an unknown key", () => {
    expect(getBuilder("unknown-builder")).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for each known key", () => {
    for (const key of ["bolt", "v0", "lovable", "claude"] as const) {
      expect(getBuilder(key)).toBe(BUILDERS[key]);
    }
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });
});

describe("BUILDERS build URLs", () => {
  const prompt = "Build a quiz app for chemistry class";

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

  it("handles prompts with special characters safely", () => {
    const tricky = 'Build an app with "quotes" & ampersands <tags>';
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(tricky);
      expect(url).not.toContain('"');
      expect(url).not.toContain("<");
      expect(url).not.toContain(">");
    }
  });
});
