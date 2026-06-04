import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../builders";

describe("BUILDERS", () => {
  it("defines bolt, v0, lovable, and claude targets", () => {
    expect(Object.keys(BUILDERS)).toEqual(
      expect.arrayContaining(["bolt", "v0", "lovable", "claude"]),
    );
  });

  it("each target has a key, name, tagline, and buildUrl function", () => {
    for (const [key, b] of Object.entries(BUILDERS)) {
      expect(b.key).toBe(key);
      expect(typeof b.name).toBe("string");
      expect(typeof b.tagline).toBe("string");
      expect(typeof b.buildUrl).toBe("function");
    }
  });
});

describe("getBuilder", () => {
  it("returns the bolt builder for 'bolt'", () => {
    expect(getBuilder("bolt").key).toBe("bolt");
  });
  it("returns the v0 builder for 'v0'", () => {
    expect(getBuilder("v0").key).toBe("v0");
  });
  it("falls back to bolt for an unknown key", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });
  it("falls back to bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });
  it("falls back to bolt for undefined", () => {
    expect(getBuilder(undefined).key).toBe("bolt");
  });
});

describe("builder deep links", () => {
  const prompt = "Build a todo app for students";

  it("bolt URL encodes the prompt as a query param", () => {
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("v0 URL encodes the prompt as a query param", () => {
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

  it("handles special characters in the prompt", () => {
    const special = "Build a tool with <tags> & 'quotes'";
    const url = BUILDERS.bolt.buildUrl(special);
    expect(url).toContain(encodeURIComponent(special));
  });
});
