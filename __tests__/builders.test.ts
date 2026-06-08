import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../lib/builders";

describe("BUILDERS", () => {
  it("contains entries for bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(expect.arrayContaining(["bolt", "v0", "lovable", "claude"]));
  });

  it("each builder has a buildUrl function", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.buildUrl).toBe("function");
    }
  });

  it("each buildUrl encodes the prompt into the URL", () => {
    const prompt = "Build me a todo app with <special> chars & more";
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });
});

describe("getBuilder", () => {
  it("returns bolt for an unknown key", () => {
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns bolt for undefined", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for a known key", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});
