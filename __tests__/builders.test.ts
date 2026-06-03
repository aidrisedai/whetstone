import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt by default when key is undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("returns bolt by default when key is null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("returns bolt by default when key is unknown", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("returns the requested builder by key", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
    expect(getBuilder("bolt").key).toBe("bolt");
  });
});

describe("builder.buildUrl", () => {
  it("bolt encodes the prompt into a URL", () => {
    const url = BUILDERS.bolt.buildUrl("Build a todo app");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("Build a todo app"));
  });

  it("handles special characters in the prompt", () => {
    const prompt = "Build: a & b > c";
    const url = BUILDERS.v0.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
    expect(url).not.toContain(" ");
  });

  it("each builder generates a different domain", () => {
    const prompt = "test";
    const urls = Object.values(BUILDERS).map((b) => b.buildUrl(prompt));
    const domains = urls.map((u) => new URL(u).hostname);
    const unique = new Set(domains);
    expect(unique.size).toBe(4);
  });
});
