import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt for unknown key", () => {
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns bolt for undefined", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for each known key", () => {
    expect(getBuilder("bolt")).toBe(BUILDERS.bolt);
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});

describe("builder buildUrl", () => {
  const prompt = "Build me a quiz app about dogs & cats";

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
    const special = "Build a chat app with <script>alert('xss')</script>";
    const url = BUILDERS.bolt.buildUrl(special);
    expect(url).not.toContain("<script>");
    expect(url).toContain(encodeURIComponent(special));
  });
});
