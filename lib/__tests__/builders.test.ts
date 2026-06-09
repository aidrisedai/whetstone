import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "../builders";

describe("BUILDERS", () => {
  it("defines bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it("generates correct bolt URL", () => {
    const url = BUILDERS.bolt.buildUrl("my prompt");
    expect(url).toBe("https://bolt.new/?prompt=my%20prompt");
  });

  it("generates correct v0 URL", () => {
    const url = BUILDERS.v0.buildUrl("my prompt");
    expect(url).toBe("https://v0.dev/chat?q=my%20prompt");
  });

  it("generates correct lovable URL", () => {
    const url = BUILDERS.lovable.buildUrl("my prompt");
    expect(url).toBe("https://lovable.dev/?prompt=my%20prompt");
  });

  it("generates correct Claude URL", () => {
    const url = BUILDERS.claude.buildUrl("my prompt");
    expect(url).toBe("https://claude.ai/new?q=my%20prompt");
  });

  it("URL-encodes special characters in prompts", () => {
    const url = BUILDERS.bolt.buildUrl("build a to-do app & dashboard");
    expect(url).toContain(encodeURIComponent("build a to-do app & dashboard"));
  });
});

describe("getBuilder", () => {
  it("returns the requested builder by key", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("falls back to bolt for null/undefined", () => {
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
  });
});
