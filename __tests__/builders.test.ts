import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt for unknown key", () => {
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });

  it("returns bolt when key is null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns bolt when key is undefined", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for each known key", () => {
    for (const key of ["bolt", "v0", "lovable", "claude"] as const) {
      expect(getBuilder(key)).toBe(BUILDERS[key]);
    }
  });
});

describe("BUILDERS deep links", () => {
  it("bolt buildUrl encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("Build a todo app");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("Build a todo app"));
  });

  it("v0 buildUrl encodes the prompt", () => {
    const url = BUILDERS.v0.buildUrl("Build a dashboard");
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent("Build a dashboard"));
  });

  it("lovable buildUrl encodes the prompt", () => {
    const url = BUILDERS.lovable.buildUrl("Build a notes app");
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent("Build a notes app"));
  });

  it("claude buildUrl encodes the prompt", () => {
    const url = BUILDERS.claude.buildUrl("Build a quiz app");
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent("Build a quiz app"));
  });

  it("handles special characters in prompts", () => {
    const prompt = 'Build an app with "quotes" & <tags>';
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
  });
});
