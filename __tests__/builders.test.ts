import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../lib/builders";

describe("getBuilder", () => {
  it("returns bolt as the default when key is undefined", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns bolt as the default when key is null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns bolt as the default for an unknown key", () => {
    expect(getBuilder("unknown-builder")).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for each known key", () => {
    expect(getBuilder("bolt")).toBe(BUILDERS.bolt);
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});

describe("BUILDERS deep-link URLs", () => {
  const prompt = "Build me a todo app";
  const encoded = encodeURIComponent(prompt);

  it("bolt URL encodes the prompt correctly", () => {
    expect(BUILDERS.bolt.buildUrl(prompt)).toBe(`https://bolt.new/?prompt=${encoded}`);
  });

  it("v0 URL encodes the prompt correctly", () => {
    expect(BUILDERS.v0.buildUrl(prompt)).toBe(`https://v0.app/chat?q=${encoded}`);
  });

  it("lovable URL encodes the prompt correctly", () => {
    expect(BUILDERS.lovable.buildUrl(prompt)).toBe(`https://lovable.dev/?prompt=${encoded}`);
  });

  it("claude URL encodes the prompt correctly", () => {
    expect(BUILDERS.claude.buildUrl(prompt)).toBe(`https://claude.ai/new?q=${encoded}`);
  });

  it("encodes special characters in prompts", () => {
    const special = "App with & <special> chars?";
    expect(BUILDERS.bolt.buildUrl(special)).toContain(encodeURIComponent(special));
  });
});
