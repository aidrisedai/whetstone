import { describe, it, expect, vi, afterEach } from "vitest";
import { reasoning, isDemoMode, MODELS } from "../lib/anthropic";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("reasoning", () => {
  it("returns adaptive thinking config for claude-opus-4-8", () => {
    const r = reasoning("claude-opus-4-8", "high");
    expect(r.thinking).toEqual({ type: "adaptive" });
    expect(r.output_config).toEqual({ effort: "high" });
  });

  it("returns adaptive thinking config for claude-sonnet-4-6", () => {
    const r = reasoning("claude-sonnet-4-6", "low");
    expect(r.thinking).toEqual({ type: "adaptive" });
    expect(r.output_config).toEqual({ effort: "low" });
  });

  it("returns empty object for claude-haiku-4-5 (unsupported)", () => {
    const r = reasoning("claude-haiku-4-5", "medium");
    expect(r).toEqual({});
  });

  it("returns empty object for claude-sonnet-4-5 (unsupported)", () => {
    const r = reasoning("claude-sonnet-4-5", "medium");
    expect(r).toEqual({});
  });
});

describe("isDemoMode", () => {
  it("returns true when WHETSTONE_DEMO=1", () => {
    vi.stubEnv("WHETSTONE_DEMO", "1");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-fake");
    // Re-import after stubbing — module is cached, so test the function directly
    expect(isDemoMode()).toBe(true);
  });

  it("returns true when ANTHROPIC_API_KEY is unset", () => {
    vi.stubEnv("WHETSTONE_DEMO", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(isDemoMode()).toBe(true);
  });
});

describe("MODELS defaults", () => {
  it("has expected default model names", () => {
    expect(MODELS.advisor).toBe("claude-sonnet-4-6");
    expect(MODELS.scoring).toBe("claude-opus-4-8");
    expect(MODELS.lesson).toBe("claude-opus-4-8");
    expect(MODELS.builder).toBe("claude-opus-4-8");
    expect(MODELS.coach).toBe("claude-opus-4-8");
  });
});
