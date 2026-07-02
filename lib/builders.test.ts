import { describe, expect, it } from "vitest";
import { BUILDERS, getBuilder } from "./builders";

describe("getBuilder", () => {
  it("returns the requested builder by key", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
  });

  it("falls back to bolt for an unknown, null, or missing key", () => {
    expect(getBuilder("nonexistent")).toBe(BUILDERS.bolt);
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });
});

describe("BUILDERS.buildUrl", () => {
  it("URL-encodes the prompt for every builder", () => {
    const prompt = "build a & test app";
    for (const builder of Object.values(BUILDERS)) {
      expect(builder.buildUrl(prompt)).toContain(encodeURIComponent(prompt));
    }
  });
});
