import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns the bolt builder for the 'bolt' key", () => {
    const b = getBuilder("bolt");
    expect(b.key).toBe("bolt");
    expect(b.name).toBe("Bolt.new");
  });

  it("returns the v0 builder for 'v0'", () => {
    const b = getBuilder("v0");
    expect(b.key).toBe("v0");
  });

  it("returns the lovable builder for 'lovable'", () => {
    const b = getBuilder("lovable");
    expect(b.key).toBe("lovable");
  });

  it("returns the claude builder for 'claude'", () => {
    const b = getBuilder("claude");
    expect(b.key).toBe("claude");
  });

  it("falls back to bolt for an unknown key", () => {
    const b = getBuilder("unknown-builder");
    expect(b.key).toBe("bolt");
  });

  it("falls back to bolt for null", () => {
    const b = getBuilder(null);
    expect(b.key).toBe("bolt");
  });

  it("falls back to bolt for undefined", () => {
    const b = getBuilder(undefined);
    expect(b.key).toBe("bolt");
  });
});

describe("builder URLs", () => {
  const encoded = encodeURIComponent("Build a task tracker.");

  it("bolt URL includes the encoded prompt", () => {
    const url = BUILDERS.bolt.buildUrl("Build a task tracker.");
    expect(url).toContain(encoded);
    expect(url).toMatch(/^https:\/\/bolt\.new/);
  });

  it("v0 URL includes the encoded prompt", () => {
    const url = BUILDERS.v0.buildUrl("Build a task tracker.");
    expect(url).toContain(encoded);
    expect(url).toMatch(/^https:\/\/v0\.app/);
  });

  it("lovable URL includes the encoded prompt", () => {
    const url = BUILDERS.lovable.buildUrl("Build a task tracker.");
    expect(url).toContain(encoded);
    expect(url).toMatch(/^https:\/\/lovable\.dev/);
  });

  it("claude URL includes the encoded prompt", () => {
    const url = BUILDERS.claude.buildUrl("Build a task tracker.");
    expect(url).toContain(encoded);
    expect(url).toMatch(/^https:\/\/claude\.ai/);
  });
});
