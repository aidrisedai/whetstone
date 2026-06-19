import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder, activeBuilder } from "@/lib/builders";

describe("BUILDERS", () => {
  it("has entries for all four builders", () => {
    expect(Object.keys(BUILDERS).sort()).toEqual(["bolt", "claude", "lovable", "v0"]);
  });

  it("each builder has required fields", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.key).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });
});

describe("getBuilder", () => {
  it("returns the bolt builder by default", () => {
    expect(getBuilder()).toBe(BUILDERS.bolt);
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder by key", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});

describe("builder buildUrl", () => {
  it("bolt URL contains the encoded prompt", () => {
    const url = BUILDERS.bolt.buildUrl("build a todo app");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("build a todo app"));
  });

  it("v0 URL contains the encoded prompt", () => {
    const url = BUILDERS.v0.buildUrl("my prompt");
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent("my prompt"));
  });

  it("lovable URL contains the encoded prompt", () => {
    const url = BUILDERS.lovable.buildUrl("cool app");
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent("cool app"));
  });

  it("claude URL contains the encoded prompt", () => {
    const url = BUILDERS.claude.buildUrl("my project");
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent("my project"));
  });

  it("handles special characters in the prompt", () => {
    const prompt = "Build an app for <teens> & makers!";
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
  });
});

describe("activeBuilder", () => {
  it("returns a valid builder object", () => {
    const b = activeBuilder();
    expect(b).toHaveProperty("key");
    expect(b).toHaveProperty("buildUrl");
  });
});
