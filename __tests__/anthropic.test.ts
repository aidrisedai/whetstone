import { describe, it, expect } from "vitest";
import { reasoning } from "@/lib/anthropic";

/**
 * reasoning() is the only exported surface that exercises supportsAdaptiveEffort.
 * We verify it returns the right shape for known models rather than testing the
 * private function directly.
 */
describe("reasoning()", () => {
  it("returns thinking + output_config for Opus 4.5", () => {
    const r = reasoning("claude-opus-4-5", "medium");
    expect(r).toHaveProperty("thinking", { type: "adaptive" });
    expect(r).toHaveProperty("output_config.effort", "medium");
  });

  it("returns thinking + output_config for Opus 4.8", () => {
    const r = reasoning("claude-opus-4-8", "high");
    expect(r).toHaveProperty("thinking", { type: "adaptive" });
    expect(r).toHaveProperty("output_config.effort", "high");
  });

  it("returns thinking + output_config for Sonnet 4.6", () => {
    const r = reasoning("claude-sonnet-4-6", "low");
    expect(r).toHaveProperty("thinking", { type: "adaptive" });
    expect(r).toHaveProperty("output_config.effort", "low");
  });

  it("returns empty object for Haiku 4.5 (unsupported)", () => {
    expect(reasoning("claude-haiku-4-5", "low")).toEqual({});
  });

  it("returns empty object for Sonnet 4.5 (unsupported)", () => {
    expect(reasoning("claude-sonnet-4-5", "low")).toEqual({});
  });

  it("returns thinking + output_config for a hypothetical future Sonnet 4.9", () => {
    const r = reasoning("claude-sonnet-4-9", "medium");
    expect(r).toHaveProperty("thinking");
  });

  it("returns thinking + output_config for a hypothetical future Opus 4.9", () => {
    const r = reasoning("claude-opus-4-9", "medium");
    expect(r).toHaveProperty("thinking");
  });
});
