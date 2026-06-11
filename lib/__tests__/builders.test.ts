import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../builders";

describe("BUILDERS", () => {
  it("contains bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS).sort()).toEqual(["bolt", "claude", "lovable", "v0"]);
  });

  it("each builder has key, name, tagline, and buildUrl", () => {
    for (const builder of Object.values(BUILDERS)) {
      expect(typeof builder.key).toBe("string");
      expect(typeof builder.name).toBe("string");
      expect(typeof builder.tagline).toBe("string");
      expect(typeof builder.buildUrl).toBe("function");
    }
  });

  it("buildUrl encodes the prompt into a URL", () => {
    const url = BUILDERS.bolt.buildUrl("hello world");
    expect(url).toContain("hello%20world");
    expect(url.startsWith("https://")).toBe(true);
  });

  it("each builder URL contains its expected domain", () => {
    expect(BUILDERS.bolt.buildUrl("x")).toContain("bolt.new");
    expect(BUILDERS.v0.buildUrl("x")).toContain("v0.app");
    expect(BUILDERS.lovable.buildUrl("x")).toContain("lovable.dev");
    expect(BUILDERS.claude.buildUrl("x")).toContain("claude.ai");
  });

  it("buildUrl encodes special characters", () => {
    const prompt = "Build a <todo> app & track it!";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url).not.toContain("<");
      expect(url).not.toContain(">");
      expect(url).not.toContain("&");
    }
  });
});

describe("getBuilder", () => {
  it("returns bolt for the key 'bolt'", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
  });

  it("returns the correct builder for each known key", () => {
    for (const key of Object.keys(BUILDERS)) {
      expect(getBuilder(key).key).toBe(key);
    }
  });

  it("falls back to bolt for an unknown key", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("falls back to bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("falls back to bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("falls back to bolt for an empty string", () => {
    expect(getBuilder("").key).toBe("bolt");
  });
});
