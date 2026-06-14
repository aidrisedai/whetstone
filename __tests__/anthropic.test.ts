import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { reasoning, isDemoMode, MODELS } from "@/lib/anthropic";

describe("reasoning", () => {
  it("returns adaptive config for claude-sonnet-4-6", () => {
    const r = reasoning("claude-sonnet-4-6", "low");
    expect(r.thinking).toEqual({ type: "adaptive" });
    expect(r.output_config?.effort).toBe("low");
  });

  it("returns adaptive config for claude-opus-4-8", () => {
    const r = reasoning("claude-opus-4-8", "high");
    expect(r.thinking).toEqual({ type: "adaptive" });
    expect(r.output_config?.effort).toBe("high");
  });

  it("returns adaptive config for claude-opus-4-5", () => {
    const r = reasoning("claude-opus-4-5", "medium");
    expect(r.thinking).toEqual({ type: "adaptive" });
  });

  it("returns empty config for claude-haiku-4-5 (not supported)", () => {
    const r = reasoning("claude-haiku-4-5", "medium");
    expect(r).toEqual({});
  });

  it("returns empty config for claude-sonnet-4-5 (not supported)", () => {
    const r = reasoning("claude-sonnet-4-5", "medium");
    expect(r).toEqual({});
  });
});

describe("isDemoMode", () => {
  const origKey = process.env.ANTHROPIC_API_KEY;
  const origDemo = process.env.WHETSTONE_DEMO;

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = origKey;
    process.env.WHETSTONE_DEMO = origDemo;
  });

  it("returns true when WHETSTONE_DEMO=1", () => {
    process.env.WHETSTONE_DEMO = "1";
    process.env.ANTHROPIC_API_KEY = "sk-live";
    expect(isDemoMode()).toBe(true);
  });

  it("returns true when no API key present", () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.WHETSTONE_DEMO;
    expect(isDemoMode()).toBe(true);
  });

  it("returns false when key is set and DEMO is not 1", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-live-key";
    process.env.WHETSTONE_DEMO = "0";
    expect(isDemoMode()).toBe(false);
  });
});

describe("MODELS", () => {
  it("advisor defaults to claude-sonnet-4-6", () => {
    expect(MODELS.advisor).toBe("claude-sonnet-4-6");
  });
  it("scoring defaults to claude-opus-4-8", () => {
    expect(MODELS.scoring).toBe("claude-opus-4-8");
  });
  it("builder defaults to claude-opus-4-8", () => {
    expect(MODELS.builder).toBe("claude-opus-4-8");
  });
});
