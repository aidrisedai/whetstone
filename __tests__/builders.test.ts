import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns the bolt builder for key 'bolt'", () => {
    const b = getBuilder("bolt");
    expect(b.key).toBe("bolt");
    expect(b.name).toBe("Bolt.new");
  });

  it("returns the v0 builder for key 'v0'", () => {
    const b = getBuilder("v0");
    expect(b.key).toBe("v0");
    expect(b.name).toBe("v0");
  });

  it("returns the lovable builder for key 'lovable'", () => {
    const b = getBuilder("lovable");
    expect(b.key).toBe("lovable");
    expect(b.name).toBe("Lovable");
  });

  it("returns the claude builder for key 'claude'", () => {
    const b = getBuilder("claude");
    expect(b.key).toBe("claude");
    expect(b.name).toBe("Claude");
  });

  it("defaults to bolt when key is undefined", () => {
    const b = getBuilder(undefined);
    expect(b.key).toBe("bolt");
  });

  it("defaults to bolt when key is null", () => {
    const b = getBuilder(null);
    expect(b.key).toBe("bolt");
  });

  it("defaults to bolt for an unknown key", () => {
    const b = getBuilder("unknown-builder");
    expect(b.key).toBe("bolt");
  });
});

describe("buildUrl", () => {
  const prompt = "Build me a task tracker app with user auth";

  it("bolt buildUrl encodes the prompt and contains it", () => {
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("v0 buildUrl encodes the prompt and contains it", () => {
    const url = BUILDERS.v0.buildUrl(prompt);
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("lovable buildUrl encodes the prompt and contains it", () => {
    const url = BUILDERS.lovable.buildUrl(prompt);
    expect(url).toContain("lovable.dev");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("claude buildUrl encodes the prompt and contains it", () => {
    const url = BUILDERS.claude.buildUrl(prompt);
    expect(url).toContain("claude.ai");
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("bolt URL uses the prompt query param", () => {
    const url = BUILDERS.bolt.buildUrl("hello");
    expect(url).toMatch(/[?&]prompt=/);
  });

  it("v0 URL uses the q query param", () => {
    const url = BUILDERS.v0.buildUrl("hello");
    expect(url).toMatch(/[?&]q=/);
  });

  it("encodes special characters in the prompt", () => {
    const specialPrompt = "app & more <features>";
    const url = BUILDERS.bolt.buildUrl(specialPrompt);
    expect(url).toContain(encodeURIComponent(specialPrompt));
    expect(url).not.toContain("<");
    expect(url).not.toContain(">");
  });
});
