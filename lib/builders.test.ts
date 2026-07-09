import { describe, expect, it } from "vitest";
import { BUILDERS, getBuilder } from "./builders";

describe("getBuilder", () => {
  it("returns the matching builder for a known key", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
  });

  it("falls back to bolt for an unknown, null, or undefined key", () => {
    expect(getBuilder("nope")).toBe(BUILDERS.bolt);
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });
});

describe("BUILDERS", () => {
  it("every builder's buildUrl percent-encodes the prompt", () => {
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl("a b&c");
      expect(url).toContain(encodeURIComponent("a b&c"));
      expect(url.startsWith("https://")).toBe(true);
    }
  });
});
