import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../builders";

describe("BUILDERS", () => {
  it("defines bolt, v0, lovable, and claude targets", () => {
    expect(Object.keys(BUILDERS)).toEqual(
      expect.arrayContaining(["bolt", "v0", "lovable", "claude"]),
    );
  });

  it("each target has a name, key, and buildUrl function", () => {
    for (const [key, b] of Object.entries(BUILDERS)) {
      expect(b.key).toBe(key);
      expect(typeof b.name).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });

  it("buildUrl encodes the prompt as a URL parameter", () => {
    const prompt = "build a todo app with tags & filters";
    for (const b of Object.values(BUILDERS)) {
      const url = b.buildUrl(prompt);
      expect(url).toContain(encodeURIComponent(prompt));
    }
  });
});

describe("getBuilder", () => {
  it("returns the matching builder by key", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for unknown key", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("falls back to bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("falls back to bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });

  it("falls back to bolt for empty string", () => {
    expect(getBuilder("").key).toBe("bolt");
  });
});
