import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../lib/builders";

describe("getBuilder", () => {
  it("returns bolt by default for unknown keys", () => {
    expect(getBuilder("unknown")).toMatchObject({ key: "bolt" });
  });

  it("returns bolt when called with null", () => {
    expect(getBuilder(null)).toMatchObject({ key: "bolt" });
  });

  it("returns bolt when called with undefined", () => {
    expect(getBuilder(undefined)).toMatchObject({ key: "bolt" });
  });

  it("returns the correct builder for each known key", () => {
    for (const key of Object.keys(BUILDERS)) {
      expect(getBuilder(key).key).toBe(key);
    }
  });
});

describe("builder buildUrl", () => {
  const prompt = "build a todo app for teenagers";

  it("encodes the prompt in the bolt URL", () => {
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
    expect(url.startsWith("https://bolt.new/")).toBe(true);
  });

  it("encodes the prompt in the v0 URL", () => {
    const url = BUILDERS.v0.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("encodes the prompt in the lovable URL", () => {
    const url = BUILDERS.lovable.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("encodes the prompt in the claude URL", () => {
    const url = BUILDERS.claude.buildUrl(prompt);
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("handles prompts with special characters safely", () => {
    const special = "build a 100% free & open-source app";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(special);
      expect(url).toContain(encodeURIComponent(special));
      expect(url).not.toContain(" ");
    }
  });
});
