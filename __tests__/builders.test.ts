import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../lib/builders";

describe("getBuilder", () => {
  it("returns the bolt builder by default", () => {
    expect(getBuilder()).toBe(BUILDERS.bolt);
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
    expect(getBuilder("unknown")).toBe(BUILDERS.bolt);
  });

  it("returns the correct builder by key", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });

  it("each builder URL includes the encoded prompt", () => {
    const prompt = "Build a todo app for teenagers";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });

  it("each builder has the required fields", () => {
    for (const builder of Object.values(BUILDERS)) {
      expect(builder).toHaveProperty("key");
      expect(builder).toHaveProperty("name");
      expect(builder).toHaveProperty("tagline");
      expect(typeof builder.buildUrl).toBe("function");
    }
  });
});
