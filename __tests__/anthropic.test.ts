import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("reasoning()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function getReasoning() {
    const mod = await import("../lib/anthropic");
    return mod.reasoning;
  }

  it("returns adaptive thinking for claude-opus-4-8", async () => {
    const reasoning = await getReasoning();
    const r = reasoning("claude-opus-4-8", "medium");
    expect(r.thinking).toEqual({ type: "adaptive" });
    expect(r.output_config?.effort).toBe("medium");
  });

  it("returns adaptive thinking for claude-sonnet-4-6", async () => {
    const reasoning = await getReasoning();
    const r = reasoning("claude-sonnet-4-6", "high");
    expect(r.thinking).toEqual({ type: "adaptive" });
    expect(r.output_config?.effort).toBe("high");
  });

  it("returns empty config for unsupported models (haiku)", async () => {
    const reasoning = await getReasoning();
    const r = reasoning("claude-haiku-4-5-20251001", "high");
    expect(r).toEqual({});
  });

  it("returns empty config for unknown model strings", async () => {
    const reasoning = await getReasoning();
    const r = reasoning("gpt-4o", "low");
    expect(r).toEqual({});
  });
});

describe("isDemoMode()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when WHETSTONE_DEMO=1", async () => {
    vi.stubEnv("WHETSTONE_DEMO", "1");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-real-key");
    const { isDemoMode } = await import("../lib/anthropic");
    expect(isDemoMode()).toBe(true);
  });

  it("returns true when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("WHETSTONE_DEMO", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { isDemoMode } = await import("../lib/anthropic");
    expect(isDemoMode()).toBe(true);
  });

  it("returns false when key is present and demo is not forced", async () => {
    vi.stubEnv("WHETSTONE_DEMO", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-key");
    const { isDemoMode } = await import("../lib/anthropic");
    expect(isDemoMode()).toBe(false);
  });
});

describe("MODELS defaults", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses claude-sonnet-4-6 as default advisor model", async () => {
    vi.stubEnv("WHETSTONE_ADVISOR_MODEL", "");
    const { MODELS } = await import("../lib/anthropic");
    expect(MODELS.advisor).toBe("claude-sonnet-4-6");
  });

  it("respects WHETSTONE_ADVISOR_MODEL env override", async () => {
    vi.stubEnv("WHETSTONE_ADVISOR_MODEL", "claude-haiku-4-5-20251001");
    const { MODELS } = await import("../lib/anthropic");
    expect(MODELS.advisor).toBe("claude-haiku-4-5-20251001");
  });

  it("uses claude-opus-4-8 as default scoring model", async () => {
    vi.stubEnv("WHETSTONE_SCORING_MODEL", "");
    const { MODELS } = await import("../lib/anthropic");
    expect(MODELS.scoring).toBe("claude-opus-4-8");
  });
});
