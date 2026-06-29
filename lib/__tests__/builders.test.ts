import { describe, it, expect } from "vitest";
import { getBuilder, activeBuilder, BUILDERS } from "../builders";

describe("getBuilder", () => {
  it("returns bolt for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("returns the correct builder for each key", () => {
    for (const key of Object.keys(BUILDERS)) {
      expect(getBuilder(key).key).toBe(key);
    }
  });
});

describe("activeBuilder", () => {
  it("defaults to bolt when WHETSTONE_BUILDER is unset", () => {
    const original = process.env.WHETSTONE_BUILDER;
    delete process.env.WHETSTONE_BUILDER;
    expect(activeBuilder().key).toBe("bolt");
    if (original !== undefined) process.env.WHETSTONE_BUILDER = original;
  });
});

describe("BUILDERS deep links", () => {
  const prompt = "build a task tracker";

  it("bolt URL includes encoded prompt", () => {
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("v0 URL includes encoded prompt", () => {
    const url = BUILDERS.v0.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("lovable URL includes encoded prompt", () => {
    const url = BUILDERS.lovable.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("claude URL includes encoded prompt", () => {
    const url = BUILDERS.claude.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("all builders produce HTTPS URLs", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(b.buildUrl(prompt)).toMatch(/^https:\/\//);
    }
  });
});
