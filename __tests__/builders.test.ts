import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder, activeBuilder } from "../lib/builders";

describe("BUILDERS", () => {
  it("defines bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it("generates a valid bolt URL", () => {
    const url = BUILDERS.bolt.buildUrl("my app idea");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("my app idea"));
  });

  it("generates a valid v0 URL", () => {
    const url = BUILDERS.v0.buildUrl("dashboard app");
    expect(url).toContain("v0.app");
  });

  it("generates a valid lovable URL", () => {
    const url = BUILDERS.lovable.buildUrl("chat app");
    expect(url).toContain("lovable.dev");
  });

  it("generates a valid claude URL", () => {
    const url = BUILDERS.claude.buildUrl("quiz app");
    expect(url).toContain("claude.ai");
  });
});

describe("getBuilder", () => {
  it("returns the specified builder by key", () => {
    expect(getBuilder("v0").key).toBe("v0");
  });

  it("falls back to bolt for unknown key", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("falls back to bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("falls back to bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });
});

describe("activeBuilder", () => {
  it("returns a valid builder", () => {
    const b = activeBuilder();
    expect(b).toHaveProperty("key");
    expect(b).toHaveProperty("buildUrl");
  });
});
