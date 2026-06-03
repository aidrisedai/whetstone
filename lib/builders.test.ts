import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getBuilder, activeBuilder, BUILDERS } from "./builders";

describe("getBuilder", () => {
  it("returns bolt for unknown keys", () => expect(getBuilder("unknown").key).toBe("bolt"));
  it("returns bolt when key is null", () => expect(getBuilder(null).key).toBe("bolt"));
  it("returns bolt when key is undefined", () => expect(getBuilder(undefined).key).toBe("bolt"));
  it("returns the correct builder for each known key", () => {
    for (const key of ["bolt", "v0", "lovable", "claude"] as const) {
      expect(getBuilder(key).key).toBe(key);
    }
  });
});

describe("BUILDERS deep links", () => {
  const prompt = "Build a task tracker for students";

  it("bolt URL contains the encoded prompt", () => {
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("v0 URL contains the encoded prompt", () => {
    const url = BUILDERS.v0.buildUrl(prompt);
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("lovable URL contains the encoded prompt", () => {
    const url = BUILDERS.lovable.buildUrl(prompt);
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("claude URL contains the encoded prompt", () => {
    const url = BUILDERS.claude.buildUrl(prompt);
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent(prompt));
  });
});

describe("activeBuilder", () => {
  const origEnv = process.env.WHETSTONE_BUILDER;

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env.WHETSTONE_BUILDER;
    } else {
      process.env.WHETSTONE_BUILDER = origEnv;
    }
  });

  it("defaults to bolt when env is unset", () => {
    delete process.env.WHETSTONE_BUILDER;
    expect(activeBuilder().key).toBe("bolt");
  });

  it("returns the configured builder when env is set", () => {
    process.env.WHETSTONE_BUILDER = "v0";
    expect(activeBuilder().key).toBe("v0");
  });

  it("falls back to bolt for an unrecognised env value", () => {
    process.env.WHETSTONE_BUILDER = "nonexistent";
    expect(activeBuilder().key).toBe("bolt");
  });
});
