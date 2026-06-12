import { describe, it, expect } from "vitest";
import { getBuilder, activeBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt when key is undefined", () => {
    expect(getBuilder(undefined)).toBe(BUILDERS.bolt);
  });

  it("returns bolt when key is null", () => {
    expect(getBuilder(null)).toBe(BUILDERS.bolt);
  });

  it("returns bolt for an unknown key", () => {
    expect(getBuilder("unknown_builder")).toBe(BUILDERS.bolt);
  });

  it("returns v0 for 'v0'", () => {
    expect(getBuilder("v0")).toBe(BUILDERS.v0);
  });

  it("returns lovable for 'lovable'", () => {
    expect(getBuilder("lovable")).toBe(BUILDERS.lovable);
  });

  it("returns claude for 'claude'", () => {
    expect(getBuilder("claude")).toBe(BUILDERS.claude);
  });
});

describe("builder URLs", () => {
  it("bolt URL contains prompt", () => {
    const url = BUILDERS.bolt.buildUrl("my todo app");
    expect(url).toContain("bolt.new");
    expect(url).toContain("my%20todo%20app");
  });

  it("v0 URL contains prompt", () => {
    const url = BUILDERS.v0.buildUrl("my todo app");
    expect(url).toContain("v0");
    expect(url).toContain("my%20todo%20app");
  });

  it("lovable URL contains prompt", () => {
    const url = BUILDERS.lovable.buildUrl("my todo app");
    expect(url).toContain("lovable.dev");
    expect(url).toContain("my%20todo%20app");
  });

  it("claude URL contains prompt", () => {
    const url = BUILDERS.claude.buildUrl("my todo app");
    expect(url).toContain("claude.ai");
    expect(url).toContain("my%20todo%20app");
  });

  it("encodes special characters", () => {
    const url = BUILDERS.bolt.buildUrl("app with & special <chars>");
    expect(url).not.toContain(" ");
    expect(url).not.toContain("&");
    expect(url).not.toContain("<");
  });
});

describe("activeBuilder", () => {
  it("returns a valid builder", () => {
    const builder = activeBuilder();
    expect(builder).toBeDefined();
    expect(typeof builder.buildUrl).toBe("function");
    expect(typeof builder.name).toBe("string");
  });
});
