import { describe, it, expect, vi, beforeEach } from "vitest";

describe("isDemoMode", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.WHETSTONE_DEMO;
  });

  it("returns true when no API key is set", async () => {
    const { isDemoMode } = await import("../anthropic");
    expect(isDemoMode()).toBe(true);
  });

  it("returns false when API key is set", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    const { isDemoMode } = await import("../anthropic");
    expect(isDemoMode()).toBe(false);
  });

  it("returns true when WHETSTONE_DEMO=1 even with a key", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    process.env.WHETSTONE_DEMO = "1";
    const { isDemoMode } = await import("../anthropic");
    expect(isDemoMode()).toBe(true);
  });
});

describe("reasoning", () => {
  it("applies effort for supported models (Sonnet 4.6)", async () => {
    const { reasoning } = await import("../anthropic");
    const r = reasoning("claude-sonnet-4-6", "low");
    expect(r).toHaveProperty("thinking");
    expect(r).toHaveProperty("output_config");
  });

  it("returns empty config for unsupported models (Haiku 4.5)", async () => {
    const { reasoning } = await import("../anthropic");
    const r = reasoning("claude-haiku-4-5-20251001", "high");
    expect(Object.keys(r)).toHaveLength(0);
  });

  it("applies effort for Opus 4.8", async () => {
    const { reasoning } = await import("../anthropic");
    const r = reasoning("claude-opus-4-8", "medium");
    expect(r).toHaveProperty("thinking");
  });
});
