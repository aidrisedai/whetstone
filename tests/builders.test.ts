import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("BUILDERS", () => {
  it("contains the four known builders", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it("each builder has a buildUrl that includes the encoded prompt", () => {
    const prompt = "Build a todo app";
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
      expect(url).toMatch(/^https?:\/\//);
    }
  });
});

describe("getBuilder", () => {
  it("returns the matching builder for a known key", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
  });
});
