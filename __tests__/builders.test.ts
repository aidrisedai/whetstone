import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../lib/builders";

describe("getBuilder", () => {
  it("returns bolt by default when key is undefined", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns bolt when key is null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns bolt when key is an unknown string", () => {
    expect(getBuilder("unknown-builder")).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for each supported key", () => {
    expect(getBuilder("bolt")).toBe(BUILDERS.bolt);
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});

describe("BUILDERS", () => {
  it("defines the expected builder keys", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it("generates valid build URLs that include the encoded prompt", () => {
    for (const builder of Object.values(BUILDERS)) {
      const prompt = "Build a todo app";
      const url = builder.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
      expect(url.startsWith("https://")).toBe(true);
    }
  });

  it("URL-encodes special characters in the prompt", () => {
    const prompt = "Build an app with & special=chars?yes";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url).not.toContain("&special");
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });
});
