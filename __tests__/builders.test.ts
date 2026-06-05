import { describe, it, expect, afterEach } from "vitest";
import { BUILDERS, getBuilder, activeBuilder } from "../lib/builders";

describe("BUILDERS registry", () => {
  it("contains bolt, v0, lovable, claude", () => {
    expect(Object.keys(BUILDERS).sort()).toEqual(["bolt", "claude", "lovable", "v0"]);
  });

  it("every builder has a key matching its record key", () => {
    for (const [key, builder] of Object.entries(BUILDERS)) {
      expect(builder.key).toBe(key);
    }
  });

  it("bolt URL encodes the prompt correctly", () => {
    const url = BUILDERS.bolt.buildUrl("hello world & more");
    expect(url).toContain("bolt.new");
    expect(url).toContain("hello%20world%20%26%20more");
  });

  it("v0 URL encodes the prompt correctly", () => {
    const url = BUILDERS.v0.buildUrl("build me a dashboard");
    expect(url).toContain("v0.app");
    expect(url).toContain("build%20me%20a%20dashboard");
  });

  it("lovable URL encodes the prompt correctly", () => {
    const url = BUILDERS.lovable.buildUrl("my idea");
    expect(url).toContain("lovable.dev");
    expect(url).toContain("my%20idea");
  });

  it("claude URL encodes the prompt correctly", () => {
    const url = BUILDERS.claude.buildUrl("my idea");
    expect(url).toContain("claude.ai");
    expect(url).toContain("my%20idea");
  });
});

describe("getBuilder", () => {
  it("returns the correct builder for a valid key", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("bolt").key).toBe("bolt");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
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

  it("falls back to bolt for empty string", () => {
    expect(getBuilder("").key).toBe("bolt");
  });
});

describe("activeBuilder", () => {
  const originalEnv = process.env.WHETSTONE_BUILDER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.WHETSTONE_BUILDER;
    } else {
      process.env.WHETSTONE_BUILDER = originalEnv;
    }
  });

  it("returns bolt when WHETSTONE_BUILDER is unset", () => {
    delete process.env.WHETSTONE_BUILDER;
    expect(activeBuilder().key).toBe("bolt");
  });

  it("returns the configured builder", () => {
    process.env.WHETSTONE_BUILDER = "v0";
    expect(activeBuilder().key).toBe("v0");
  });

  it("falls back to bolt for an invalid WHETSTONE_BUILDER value", () => {
    process.env.WHETSTONE_BUILDER = "nonsense";
    expect(activeBuilder().key).toBe("bolt");
  });
});
