import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt for undefined key", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns bolt for null key", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns bolt for unknown key", () => {
    expect(getBuilder("notabuilder")).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder for each valid key", () => {
    expect(getBuilder("bolt")).toBe(BUILDERS.bolt);
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });

  it("every builder produces a URL containing the encoded prompt", () => {
    const prompt = "Build a todo app for students";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });
});
