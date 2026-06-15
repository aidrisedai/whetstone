import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../lib/builders";

describe("getBuilder", () => {
  it("returns the bolt builder by default for unknown key", () => {
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });

  it("returns the bolt builder for null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns the bolt builder for undefined", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns the v0 builder for 'v0'", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
  });

  it("returns the lovable builder for 'lovable'", () => {
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
  });

  it("returns the claude builder for 'claude'", () => {
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});

describe("BUILDERS URLs", () => {
  it("bolt.new encodes the prompt into the URL", () => {
    const url = BUILDERS.bolt.buildUrl("make a todo app");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("make a todo app"));
  });

  it("v0 encodes the prompt into the URL", () => {
    const url = BUILDERS.v0.buildUrl("landing page");
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent("landing page"));
  });

  it("lovable encodes the prompt into the URL", () => {
    const url = BUILDERS.lovable.buildUrl("chat app");
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent("chat app"));
  });

  it("claude encodes the prompt into the URL", () => {
    const url = BUILDERS.claude.buildUrl("game");
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent("game"));
  });

  it("handles prompts with special characters", () => {
    const prompt = "build a TODO app with React & TypeScript";
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
  });
});
