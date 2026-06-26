import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../builders";

describe("BUILDERS registry", () => {
  it("has entries for bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it("every builder's key matches its registry key", () => {
    for (const [key, builder] of Object.entries(BUILDERS)) {
      expect(builder.key).toBe(key);
    }
  });

  it("every builder produces an https deep link containing the encoded prompt", () => {
    const prompt = "build a todo app for kids";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url.startsWith("https://")).toBe(true);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });

  it("URL-encodes special characters in prompts", () => {
    const prompt = "hello & world? foo=bar";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url).not.toContain(" ");
    }
  });
});

describe("getBuilder", () => {
  it("returns the correct builder for each known key", () => {
    expect(getBuilder("bolt")).toEqual(BUILDERS.bolt);
    expect(getBuilder("v0")).toEqual(BUILDERS.v0);
    expect(getBuilder("lovable")).toEqual(BUILDERS.lovable);
    expect(getBuilder("claude")).toEqual(BUILDERS.claude);
  });

  it("falls back to bolt for an unknown key", () => {
    expect(getBuilder("unknown")).toEqual(BUILDERS.bolt);
  });

  it("falls back to bolt for null", () => {
    expect(getBuilder(null)).toEqual(BUILDERS.bolt);
  });

  it("falls back to bolt for undefined", () => {
    expect(getBuilder(undefined)).toEqual(BUILDERS.bolt);
  });

  it("falls back to bolt for an empty string", () => {
    expect(getBuilder("")).toEqual(BUILDERS.bolt);
  });
});
