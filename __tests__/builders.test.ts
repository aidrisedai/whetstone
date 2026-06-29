import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt for unknown keys", () => {
    expect(getBuilder("unknown")).toEqual(BUILDERS.bolt);
  });

  it("returns bolt when no key given", () => {
    expect(getBuilder()).toEqual(BUILDERS.bolt);
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null)).toEqual(BUILDERS.bolt);
  });

  it("returns the v0 builder", () => {
    expect(getBuilder("v0").key).toBe("v0");
  });

  it("returns the lovable builder", () => {
    expect(getBuilder("lovable").key).toBe("lovable");
  });

  it("returns the claude builder", () => {
    expect(getBuilder("claude").key).toBe("claude");
  });
});

describe("buildUrl", () => {
  const prompt = "Build a social app for teen coders";

  it("bolt URL encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("v0 URL encodes the prompt", () => {
    const url = BUILDERS.v0.buildUrl(prompt);
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("lovable URL encodes the prompt", () => {
    const url = BUILDERS.lovable.buildUrl(prompt);
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("claude URL encodes the prompt", () => {
    const url = BUILDERS.claude.buildUrl(prompt);
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("handles prompts with special characters", () => {
    const p = "Build a game with levels & boss fights (3 acts) + leaderboard";
    const url = BUILDERS.bolt.buildUrl(p);
    expect(url).toContain(encodeURIComponent(p));
    expect(url).not.toContain("&boss");
  });
});
