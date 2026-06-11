import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MODELS, reasoning, isDemoMode } from "../lib/anthropic";

describe("MODELS defaults", () => {
  it("advisor defaults to claude-sonnet-4-6", () => {
    expect(MODELS.advisor).toBe("claude-sonnet-4-6");
  });

  it("scoring defaults to claude-opus-4-8", () => {
    expect(MODELS.scoring).toBe("claude-opus-4-8");
  });

  it("lesson defaults to claude-opus-4-8", () => {
    expect(MODELS.lesson).toBe("claude-opus-4-8");
  });

  it("builder defaults to claude-opus-4-8", () => {
    expect(MODELS.builder).toBe("claude-opus-4-8");
  });

  it("coach defaults to claude-opus-4-8", () => {
    expect(MODELS.coach).toBe("claude-opus-4-8");
  });
});

describe("reasoning()", () => {
  it("returns adaptive thinking config for claude-opus-4-8", () => {
    const r = reasoning("claude-opus-4-8", "high");
    expect(r).toMatchObject({
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
    });
  });

  it("returns adaptive thinking config for claude-sonnet-4-6", () => {
    const r = reasoning("claude-sonnet-4-6", "medium");
    expect(r).toMatchObject({
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
    });
  });

  it("returns empty object for claude-haiku-4-5 (unsupported)", () => {
    expect(reasoning("claude-haiku-4-5-20251001", "high")).toEqual({});
  });

  it("returns empty object for claude-sonnet-4-5 (unsupported)", () => {
    expect(reasoning("claude-sonnet-4-5", "low")).toEqual({});
  });

  it("passes effort level through correctly", () => {
    const low = reasoning("claude-opus-4-8", "low");
    const high = reasoning("claude-opus-4-8", "high");
    expect((low.output_config as { effort: string } | undefined)?.effort).toBe("low");
    expect((high.output_config as { effort: string } | undefined)?.effort).toBe("high");
  });
});

describe("isDemoMode()", () => {
  const origDemo = process.env.WHETSTONE_DEMO;
  const origKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (origDemo === undefined) delete process.env.WHETSTONE_DEMO;
    else process.env.WHETSTONE_DEMO = origDemo;

    if (origKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = origKey;
  });

  it("returns true when WHETSTONE_DEMO=1", () => {
    process.env.WHETSTONE_DEMO = "1";
    process.env.ANTHROPIC_API_KEY = "sk-real-key";
    expect(isDemoMode()).toBe(true);
  });

  it("returns true when no API key is set", () => {
    delete process.env.WHETSTONE_DEMO;
    delete process.env.ANTHROPIC_API_KEY;
    expect(isDemoMode()).toBe(true);
  });

  it("returns false when API key is set and demo flag is absent", () => {
    delete process.env.WHETSTONE_DEMO;
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(isDemoMode()).toBe(false);
  });
});
