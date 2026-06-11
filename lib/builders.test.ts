import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "./builders";

describe("getBuilder", () => {
  it("returns bolt when no key is given", () => {
    expect(getBuilder()).toBe(BUILDERS.bolt);
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for a known key", () => {
    expect(getBuilder("bolt")).toBe(BUILDERS.bolt);
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });

  it("falls back to bolt for an unknown key", () => {
    expect(getBuilder("unknown-builder")).toBe(BUILDERS.bolt);
  });
});

describe("BUILDERS deep links", () => {
  const prompt = "Build a todo app for students";
  const encoded = encodeURIComponent(prompt);

  it("bolt URL encodes the prompt", () => {
    expect(BUILDERS.bolt.buildUrl(prompt)).toBe(`https://bolt.new/?prompt=${encoded}`);
  });

  it("v0 URL encodes the prompt", () => {
    expect(BUILDERS.v0.buildUrl(prompt)).toContain(encoded);
  });

  it("lovable URL encodes the prompt", () => {
    expect(BUILDERS.lovable.buildUrl(prompt)).toContain(encoded);
  });

  it("claude URL encodes the prompt", () => {
    expect(BUILDERS.claude.buildUrl(prompt)).toContain(encoded);
  });

  it("all deep links start with https://", () => {
    for (const builder of Object.values(BUILDERS)) {
      expect(builder.buildUrl(prompt)).toMatch(/^https:\/\//);
    }
  });

  it("handles a prompt with special characters safely", () => {
    const special = "Build a <script>alert('xss')</script> app";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(special);
      // The raw injection string must not appear unencoded
      expect(url).not.toContain("<script>");
    }
  });
});
