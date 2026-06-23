import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../lib/builders";

describe("getBuilder", () => {
  it("returns bolt when no key given", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns the requested builder", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown_builder")).toBe(BUILDERS.bolt);
  });

  it("generates a URL that includes the encoded prompt", () => {
    const url = BUILDERS.bolt.buildUrl("my app idea & test");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("my app idea & test"));
  });

  it("all builders produce valid HTTPS URLs", () => {
    const prompt = "test prompt";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url).toMatch(/^https:\/\//);
    }
  });
});
