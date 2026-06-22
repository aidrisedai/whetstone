import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BUILDERS, getBuilder } from "./builders";

describe("BUILDERS", () => {
  it("contains entries for bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(
      expect.arrayContaining(["bolt", "v0", "lovable", "claude"])
    );
  });

  it("each builder produces a URL containing the encoded prompt", () => {
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl("hello world");
      expect(url).toContain("hello%20world");
    }
  });

  it("all builder URLs are HTTPS", () => {
    for (const builder of Object.values(BUILDERS)) {
      expect(builder.buildUrl("test").startsWith("https://")).toBe(true);
    }
  });
});

describe("getBuilder", () => {
  it("returns the bolt builder by default for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("returns the correct builder for a known key", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });
});
