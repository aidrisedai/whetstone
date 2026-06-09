import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder, activeBuilder } from "@/lib/builders";

describe("BUILDERS registry", () => {
  it("contains bolt, v0, lovable, claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(
      expect.arrayContaining(["bolt", "v0", "lovable", "claude"]),
    );
  });

  it("each builder has key, name, tagline, and buildUrl function", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(typeof b.key).toBe("string");
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });
});

describe("getBuilder", () => {
  it("returns the requested builder by key", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
  });
});

describe("buildUrl", () => {
  it("bolt encodes the prompt in the URL", () => {
    const url = BUILDERS.bolt.buildUrl("Build me a todo app");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("Build me a todo app"));
  });

  it("v0 encodes the prompt in the URL", () => {
    const url = BUILDERS.v0.buildUrl("Build a UI component");
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent("Build a UI component"));
  });

  it("handles special characters in the prompt", () => {
    const prompt = "Build an app with & special <characters> and \"quotes\"";
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
  });
});

describe("activeBuilder", () => {
  it("returns a valid builder", () => {
    const b = activeBuilder();
    expect(typeof b.key).toBe("string");
    expect(typeof b.buildUrl).toBe("function");
  });
});
