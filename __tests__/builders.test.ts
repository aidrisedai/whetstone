import { describe, it, expect, afterEach } from "vitest";
import { getBuilder, activeBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt by default when no key given", () => {
    expect(getBuilder()).toEqual(BUILDERS.bolt);
    expect(getBuilder(null)).toEqual(BUILDERS.bolt);
    expect(getBuilder("")).toEqual(BUILDERS.bolt);
  });

  it("returns the matching builder", () => {
    expect(getBuilder("v0")).toEqual(BUILDERS.v0);
    expect(getBuilder("lovable")).toEqual(BUILDERS.lovable);
    expect(getBuilder("claude")).toEqual(BUILDERS.claude);
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown-builder")).toEqual(BUILDERS.bolt);
  });
});

describe("BUILDERS buildUrl", () => {
  it("bolt url encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("hello world");
    expect(url).toContain(encodeURIComponent("hello world"));
    expect(url).toContain("bolt.new");
  });

  it("v0 url encodes the prompt", () => {
    const url = BUILDERS.v0.buildUrl("a & b");
    expect(url).toContain(encodeURIComponent("a & b"));
    expect(url).toContain("v0.app");
  });

  it("lovable url encodes the prompt", () => {
    const url = BUILDERS.lovable.buildUrl("test prompt");
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent("test prompt"));
  });

  it("claude url encodes the prompt", () => {
    const url = BUILDERS.claude.buildUrl("build me a game");
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent("build me a game"));
  });
});

describe("activeBuilder", () => {
  const orig = process.env.WHETSTONE_BUILDER;
  afterEach(() => {
    process.env.WHETSTONE_BUILDER = orig;
  });

  it("defaults to bolt when env not set", () => {
    delete process.env.WHETSTONE_BUILDER;
    expect(activeBuilder()).toEqual(BUILDERS.bolt);
  });

  it("respects WHETSTONE_BUILDER env var", () => {
    process.env.WHETSTONE_BUILDER = "lovable";
    expect(activeBuilder()).toEqual(BUILDERS.lovable);
  });
});
