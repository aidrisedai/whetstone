import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns the correct builder for each known key", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("defaults to bolt for an unknown key", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("defaults to bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("defaults to bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("defaults to bolt for an empty string", () => {
    expect(getBuilder("").key).toBe("bolt");
  });

  it("returns a builder with a name and tagline", () => {
    const b = getBuilder("bolt");
    expect(typeof b.name).toBe("string");
    expect(b.name.length).toBeGreaterThan(0);
    expect(typeof b.tagline).toBe("string");
  });
});

describe("builder buildUrl", () => {
  it("includes the encoded prompt in the URL", () => {
    const prompt = "Build a game with leaderboards";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });

  it("encodes special characters in the prompt", () => {
    const prompt = "hello & world = <awesome>";
    const url = getBuilder("bolt").buildUrl(prompt);
    expect(url).not.toContain(" & ");
    expect(url).toContain("%3D"); // the = from the prompt is percent-encoded
    expect(url).toContain("%3C"); // the < from the prompt is percent-encoded
  });
});
