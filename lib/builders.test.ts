import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "./builders";

describe("BUILDERS", () => {
  it("defines bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS).sort()).toEqual(["bolt", "claude", "lovable", "v0"]);
  });
});

describe("getBuilder", () => {
  it("returns bolt for an unrecognized key", () =>
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt));

  it("returns bolt for null", () => expect(getBuilder(null)).toBe(BUILDERS.bolt));

  it("returns bolt for undefined", () => expect(getBuilder(undefined)).toBe(BUILDERS.bolt));

  it("returns the correct builder for each known key", () => {
    expect(getBuilder("bolt")).toBe(BUILDERS.bolt);
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});

describe("builder deep-link URLs", () => {
  const prompt = "Build a todo app for teens";
  const encoded = encodeURIComponent(prompt);

  it("bolt URL contains bolt.new and the encoded prompt", () => {
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain("bolt.new");
    expect(url).toContain(encoded);
  });

  it("v0 URL contains v0.app and the encoded prompt", () => {
    const url = BUILDERS.v0.buildUrl(prompt);
    expect(url).toContain("v0.app");
    expect(url).toContain(encoded);
  });

  it("lovable URL contains lovable.dev and the encoded prompt", () => {
    const url = BUILDERS.lovable.buildUrl(prompt);
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encoded);
  });

  it("claude URL contains claude.ai and the encoded prompt", () => {
    const url = BUILDERS.claude.buildUrl(prompt);
    expect(url).toContain("claude.ai");
    expect(url).toContain(encoded);
  });

  it("properly encodes special characters", () => {
    const fancy = "Build an app with émojis & <special> chars";
    const url = BUILDERS.bolt.buildUrl(fancy);
    expect(url).not.toContain(" ");
    expect(url).not.toContain("<");
    expect(url).toContain(encodeURIComponent(fancy));
  });
});
