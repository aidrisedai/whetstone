import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../builders";

describe("getBuilder", () => {
  it("returns bolt by default when key is null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });
  it("returns bolt by default when key is undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });
  it("returns bolt by default when key is unknown", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });
  it("returns v0 when key is 'v0'", () => {
    expect(getBuilder("v0").key).toBe("v0");
  });
  it("returns lovable when key is 'lovable'", () => {
    expect(getBuilder("lovable").key).toBe("lovable");
  });
  it("returns claude when key is 'claude'", () => {
    expect(getBuilder("claude").key).toBe("claude");
  });
});

describe("BUILDERS", () => {
  it("all builders have a buildUrl that encodes the prompt", () => {
    const prompt = "Build a quiz app for students";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });

  it("bolt URL uses bolt.new domain", () => {
    expect(BUILDERS.bolt.buildUrl("test")).toContain("bolt.new");
  });

  it("v0 URL uses v0.app domain", () => {
    expect(BUILDERS.v0.buildUrl("test")).toContain("v0.app");
  });
});
