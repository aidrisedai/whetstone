import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../lib/builders";

describe("BUILDERS", () => {
  it("defines all expected builder keys", () => {
    expect(Object.keys(BUILDERS)).toEqual(
      expect.arrayContaining(["bolt", "v0", "lovable", "claude"]),
    );
  });

  it("each builder generates a URL containing the encoded prompt", () => {
    const prompt = "Build me a todo app";
    for (const builder of Object.values(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });
});

describe("getBuilder", () => {
  it("returns the named builder when it exists", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for an unknown key", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("falls back to bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("falls back to bolt when called with no argument", () => {
    expect(getBuilder().key).toBe("bolt");
  });
});
