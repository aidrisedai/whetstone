import { describe, expect, it } from "vitest";
import { BUILDERS, getBuilder } from "./builders";

describe("getBuilder", () => {
  it("returns the matching builder for a known key", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
  });

  it("falls back to bolt for an unknown, null, or missing key", () => {
    expect(getBuilder("nonexistent")).toBe(BUILDERS.bolt);
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });
});

describe("BuilderTarget.buildUrl", () => {
  it("URL-encodes the prompt for every registered builder", () => {
    const prompt = "Build a to-do app & sync it?";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
      expect(() => new URL(url)).not.toThrow();
    }
  });
});
