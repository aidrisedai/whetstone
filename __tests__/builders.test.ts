import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "@/lib/builders";

describe("BUILDERS", () => {
  it("has all expected builder keys", () => {
    expect(Object.keys(BUILDERS)).toEqual(
      expect.arrayContaining(["bolt", "v0", "lovable", "claude"]),
    );
  });

  it("each builder has a valid buildUrl function", () => {
    for (const [, b] of Object.entries(BUILDERS)) {
      const url = b.buildUrl("hello world");
      expect(url).toContain("hello%20world");
      expect(url.startsWith("https://")).toBe(true);
    }
  });
});

describe("getBuilder", () => {
  it("returns the matching builder", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
    expect(getBuilder("").key).toBe("bolt");
  });
});
