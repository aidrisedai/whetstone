import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder, activeBuilder } from "@/lib/builders";

describe("BUILDERS", () => {
  it("has all four expected builder keys", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  for (const [key, builder] of Object.entries(BUILDERS)) {
    it(`${key}: buildUrl encodes the prompt`, () => {
      const prompt = "build an app for me & you";
      const url = builder.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    });

    it(`${key}: has required fields`, () => {
      expect(typeof builder.key).toBe("string");
      expect(typeof builder.name).toBe("string");
      expect(typeof builder.tagline).toBe("string");
      expect(typeof builder.buildUrl).toBe("function");
    });
  }
});

describe("getBuilder", () => {
  it("returns bolt for an unknown key", () => {
    expect(getBuilder("nonexistent").key).toBe("bolt");
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("returns bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("returns the correct builder for each valid key", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
    expect(getBuilder("bolt").key).toBe("bolt");
  });
});

describe("activeBuilder", () => {
  it("returns bolt when WHETSTONE_BUILDER is not set", () => {
    delete process.env.WHETSTONE_BUILDER;
    expect(activeBuilder().key).toBe("bolt");
  });

  it("returns the configured builder when env var is set", () => {
    process.env.WHETSTONE_BUILDER = "v0";
    expect(activeBuilder().key).toBe("v0");
    delete process.env.WHETSTONE_BUILDER;
  });
});

describe("Bolt deep link", () => {
  it("uses bolt.new as base", () => {
    expect(BUILDERS.bolt.buildUrl("test")).toMatch(/^https:\/\/bolt\.new/);
  });
});

describe("v0 deep link", () => {
  it("uses v0.app as base", () => {
    expect(BUILDERS.v0.buildUrl("test")).toMatch(/^https:\/\/v0\.app/);
  });
});

describe("Lovable deep link", () => {
  it("uses lovable.dev as base", () => {
    expect(BUILDERS.lovable.buildUrl("test")).toMatch(/^https:\/\/lovable\.dev/);
  });
});

describe("Claude deep link", () => {
  it("uses claude.ai as base", () => {
    expect(BUILDERS.claude.buildUrl("test")).toMatch(/^https:\/\/claude\.ai/);
  });
});
