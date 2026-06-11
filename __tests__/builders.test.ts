import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BUILDERS, getBuilder, activeBuilder } from "../lib/builders";

describe("BUILDERS registry", () => {
  it("contains bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it("every builder has a key, name, tagline, and buildUrl function", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.key).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });
});

describe("buildUrl encoding", () => {
  it("bolt URL encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("hello world & stuff");
    expect(url).toContain("hello%20world%20%26%20stuff");
    expect(url.startsWith("https://bolt.new/")).toBe(true);
  });

  it("v0 URL encodes the prompt", () => {
    const url = BUILDERS.v0.buildUrl("my app idea");
    expect(url).toContain("my%20app%20idea");
    expect(url.startsWith("https://v0.app/")).toBe(true);
  });

  it("lovable URL encodes the prompt", () => {
    const url = BUILDERS.lovable.buildUrl("hello");
    expect(url.startsWith("https://lovable.dev/")).toBe(true);
  });

  it("claude URL encodes the prompt", () => {
    const url = BUILDERS.claude.buildUrl("test prompt");
    expect(url.startsWith("https://claude.ai/")).toBe(true);
    expect(url).toContain("test%20prompt");
  });
});

describe("getBuilder", () => {
  it("returns bolt by default for unknown key", () => {
    expect(getBuilder("nonexistent").key).toBe("bolt");
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("returns bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("returns the named builder when it exists", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
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

  it("defaults to bolt when env is unset", () => {
    delete process.env.WHETSTONE_BUILDER;
    expect(activeBuilder().key).toBe("bolt");
  });

  it("picks up WHETSTONE_BUILDER env var", () => {
    process.env.WHETSTONE_BUILDER = "v0";
    expect(activeBuilder().key).toBe("v0");
  });

  it("falls back to bolt for an unrecognised env value", () => {
    process.env.WHETSTONE_BUILDER = "unknown";
    expect(activeBuilder().key).toBe("bolt");
  });
});
