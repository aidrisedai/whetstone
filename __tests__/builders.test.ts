import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt by default", () => {
    expect(getBuilder(null)?.key).toBe("bolt");
    expect(getBuilder(undefined)?.key).toBe("bolt");
    expect(getBuilder("")?.key).toBe("bolt");
  });

  it("returns the correct builder by key", () => {
    expect(getBuilder("v0")?.key).toBe("v0");
    expect(getBuilder("lovable")?.key).toBe("lovable");
    expect(getBuilder("claude")?.key).toBe("claude");
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown")?.key).toBe("bolt");
  });
});

describe("builder URLs", () => {
  it("encodes the prompt in the bolt URL", () => {
    const url = BUILDERS.bolt.buildUrl("my cool app");
    expect(url).toContain(encodeURIComponent("my cool app"));
    expect(url.startsWith("https://bolt.new")).toBe(true);
  });

  it("encodes the prompt in the v0 URL", () => {
    const url = BUILDERS.v0.buildUrl("build a dashboard");
    expect(url).toContain(encodeURIComponent("build a dashboard"));
  });

  it("all builders have name, tagline, and key", () => {
    for (const builder of Object.values(BUILDERS)) {
      expect(typeof builder.name).toBe("string");
      expect(typeof builder.tagline).toBe("string");
      expect(typeof builder.key).toBe("string");
    }
  });
});
