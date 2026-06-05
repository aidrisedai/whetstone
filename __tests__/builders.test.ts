import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../lib/builders";

describe("getBuilder", () => {
  it("returns bolt by default for undefined key", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns bolt for an unknown key", () => {
    expect(getBuilder("unknown-builder")).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for each known key", () => {
    for (const key of ["bolt", "v0", "lovable", "claude"] as const) {
      const b = getBuilder(key);
      expect(b.key).toBe(key);
      expect(typeof b.name).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });

  it("buildUrl percent-encodes the prompt", () => {
    const bolt = getBuilder("bolt");
    const url = bolt.buildUrl("build an app with spaces & special=chars");
    // encodeURIComponent uses %20 for spaces, %26 for &, %3D for =
    expect(url).toContain("build%20an%20app%20with%20spaces%20%26%20special%3Dchars");
  });

  it("every builder produces a https URL", () => {
    for (const b of Object.values(BUILDERS)) {
      expect(b.buildUrl("test prompt").startsWith("https://")).toBe(true);
    }
  });
});
