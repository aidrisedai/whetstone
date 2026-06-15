import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../lib/builders";

describe("getBuilder", () => {
  it("returns the correct builder by key", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("falls back to bolt for null/undefined", () => {
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
  });
});

describe("buildUrl", () => {
  it("encodes the prompt in the bolt deep link", () => {
    const url = BUILDERS.bolt.buildUrl("make a to-do app");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("make a to-do app"));
  });

  it("encodes the prompt in the v0 deep link", () => {
    const url = BUILDERS.v0.buildUrl("landing page with hero");
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent("landing page with hero"));
  });

  it("handles special characters in prompts", () => {
    const prompt = "a & b = c?";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });
});
