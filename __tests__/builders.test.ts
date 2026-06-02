import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt for no key", () => {
    expect(getBuilder(undefined)?.key).toBe("bolt");
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null)?.key).toBe("bolt");
  });

  it("returns bolt for unknown key", () => {
    expect(getBuilder("unknown")?.key).toBe("bolt");
  });

  it("returns bolt builder correctly", () => {
    const b = getBuilder("bolt");
    expect(b.key).toBe("bolt");
    expect(b.name).toBe("Bolt.new");
  });

  it("returns v0 builder correctly", () => {
    const b = getBuilder("v0");
    expect(b.key).toBe("v0");
  });

  it("returns lovable builder correctly", () => {
    const b = getBuilder("lovable");
    expect(b.key).toBe("lovable");
  });

  it("returns claude builder correctly", () => {
    const b = getBuilder("claude");
    expect(b.key).toBe("claude");
  });
});

describe("builder URL generation", () => {
  it("bolt URL encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("hello world");
    expect(url).toContain(encodeURIComponent("hello world"));
    expect(url).toMatch(/^https:\/\/bolt\.new/);
  });

  it("v0 URL encodes the prompt", () => {
    const url = BUILDERS.v0.buildUrl("my app");
    expect(url).toContain(encodeURIComponent("my app"));
  });

  it("lovable URL encodes the prompt", () => {
    const url = BUILDERS.lovable.buildUrl("test");
    expect(url).toContain("test");
    expect(url).toMatch(/^https:\/\/lovable\.dev/);
  });

  it("claude URL uses correct base", () => {
    const url = BUILDERS.claude.buildUrl("hello");
    expect(url).toMatch(/^https:\/\/claude\.ai/);
  });

  it("all builders have required fields", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.key).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });
});
