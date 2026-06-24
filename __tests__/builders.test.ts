import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../lib/builders";

// ── getBuilder ─────────────────────────────────────────────────────────────

describe("getBuilder", () => {
  it("returns bolt for key 'bolt'", () => expect(getBuilder("bolt").key).toBe("bolt"));
  it("returns v0 for key 'v0'", () => expect(getBuilder("v0").key).toBe("v0"));
  it("returns lovable for key 'lovable'", () => expect(getBuilder("lovable").key).toBe("lovable"));
  it("returns claude for key 'claude'", () => expect(getBuilder("claude").key).toBe("claude"));
  it("falls back to bolt for unknown key", () => expect(getBuilder("unknown").key).toBe("bolt"));
  it("falls back to bolt for null", () => expect(getBuilder(null).key).toBe("bolt"));
  it("falls back to bolt for undefined", () => expect(getBuilder(undefined).key).toBe("bolt"));
  it("falls back to bolt for empty string", () => expect(getBuilder("").key).toBe("bolt"));
});

// ── buildUrl ───────────────────────────────────────────────────────────────

describe("BUILDERS.buildUrl", () => {
  it("bolt URL encodes the prompt", () => {
    const url = BUILDERS.bolt.buildUrl("hello world");
    expect(url).toBe("https://bolt.new/?prompt=hello%20world");
  });

  it("v0 URL encodes the prompt", () => {
    const url = BUILDERS.v0.buildUrl("a + b");
    expect(url).toContain("https://v0.app/chat?q=");
    expect(url).toContain(encodeURIComponent("a + b"));
  });

  it("lovable URL encodes the prompt", () => {
    const url = BUILDERS.lovable.buildUrl("build me an app");
    expect(url).toContain("https://lovable.dev/?prompt=");
    expect(url).toContain(encodeURIComponent("build me an app"));
  });

  it("claude URL encodes the prompt", () => {
    const url = BUILDERS.claude.buildUrl("todo list app");
    expect(url).toContain("https://claude.ai/new?q=");
    expect(url).toContain(encodeURIComponent("todo list app"));
  });

  it("encodes special characters", () => {
    const prompt = "Build an app with <tags> & 'quotes'";
    const url = BUILDERS.bolt.buildUrl(prompt);
    expect(url).toBe(`https://bolt.new/?prompt=${encodeURIComponent(prompt)}`);
  });
});
