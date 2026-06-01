import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getBuilder, BUILDERS } from "../builders";

describe("getBuilder", () => {
  it("returns bolt by default when key is undefined", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });
  it("returns bolt by default when key is null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });
  it("returns bolt by default when key is unknown", () => {
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });
  it("returns v0 when key is 'v0'", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
  });
  it("returns lovable when key is 'lovable'", () => {
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
  });
  it("returns claude when key is 'claude'", () => {
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});

describe("BUILDERS deep links", () => {
  const prompt = "Build a task manager";
  const encoded = encodeURIComponent(prompt);

  it("bolt URL contains the encoded prompt", () => {
    expect(BUILDERS.bolt.buildUrl(prompt)).toContain(encoded);
  });
  it("v0 URL contains the encoded prompt", () => {
    expect(BUILDERS.v0.buildUrl(prompt)).toContain(encoded);
  });
  it("lovable URL contains the encoded prompt", () => {
    expect(BUILDERS.lovable.buildUrl(prompt)).toContain(encoded);
  });
  it("claude URL contains the encoded prompt", () => {
    expect(BUILDERS.claude.buildUrl(prompt)).toContain(encoded);
  });
  it("encodes special characters in the prompt", () => {
    const special = "Build a & <test> app?";
    for (const builder of Object.values(BUILDERS)) {
      expect(builder.buildUrl(special)).toContain(encodeURIComponent(special));
    }
  });
});

describe("activeBuilder", () => {
  const orig = process.env.WHETSTONE_BUILDER;
  afterEach(() => {
    if (orig === undefined) delete process.env.WHETSTONE_BUILDER;
    else process.env.WHETSTONE_BUILDER = orig;
  });

  it("defaults to bolt when WHETSTONE_BUILDER is unset", async () => {
    delete process.env.WHETSTONE_BUILDER;
    // Re-import to pick up env change — use getBuilder directly as a proxy.
    expect(getBuilder(process.env.WHETSTONE_BUILDER)).toBe(BUILDERS.bolt);
  });

  it("returns v0 when WHETSTONE_BUILDER=v0", () => {
    process.env.WHETSTONE_BUILDER = "v0";
    expect(getBuilder(process.env.WHETSTONE_BUILDER)).toBe(BUILDERS.v0);
  });
});
