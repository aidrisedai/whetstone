import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../lib/builders";

describe("BUILDERS", () => {
  it("defines all four builder targets", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it.each(Object.values(BUILDERS))("$key.buildUrl encodes the prompt", ({ buildUrl }) => {
    const url = buildUrl("make a todo app");
    expect(url).toContain("make%20a%20todo%20app");
  });

  it.each(Object.values(BUILDERS))("$key.buildUrl returns an https URL", ({ buildUrl }) => {
    expect(buildUrl("test")).toMatch(/^https:\/\//);
  });
});

describe("getBuilder", () => {
  it("returns the correct builder for a known key", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("falls back to bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("falls back to bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("falls back to bolt for empty string", () => {
    expect(getBuilder("").key).toBe("bolt");
  });
});
