import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt by default for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("returns bolt when key is null or undefined", () => {
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("returns the correct builder for each known key", () => {
    for (const key of ["bolt", "v0", "lovable", "claude"] as const) {
      expect(getBuilder(key).key).toBe(key);
    }
  });
});

describe("buildUrl", () => {
  it("bolt URL encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("hello world");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("hello world"));
  });

  it("v0 URL encodes the prompt", () => {
    const url = BUILDERS.v0.buildUrl("test prompt");
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent("test prompt"));
  });

  it("lovable URL encodes the prompt", () => {
    const url = BUILDERS.lovable.buildUrl("my app");
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent("my app"));
  });

  it("claude URL encodes the prompt", () => {
    const url = BUILDERS.claude.buildUrl("build me something");
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent("build me something"));
  });

  it("encodes special characters in the prompt", () => {
    const prompt = "app with & <special> chars?";
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
    expect(url).not.toContain(" ");
  });
});
