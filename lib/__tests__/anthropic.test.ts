import { describe, expect, it } from "vitest";

// Import the internal helper via module re-export trick: vitest can reach
// unexported functions through dynamic imports, but the cleanest approach is
// to test the public `reasoning()` function which calls supportsAdaptiveEffort.
import { reasoning } from "../anthropic";

describe("reasoning()", () => {
  it("returns thinking + output_config for claude-opus-4-8", () => {
    const r = reasoning("claude-opus-4-8", "medium");
    expect(r.thinking).toEqual({ type: "adaptive" });
    expect(r.output_config).toEqual({ effort: "medium" });
  });

  it("returns thinking + output_config for claude-sonnet-4-6", () => {
    const r = reasoning("claude-sonnet-4-6", "low");
    expect(r.thinking).toEqual({ type: "adaptive" });
    expect(r.output_config).toEqual({ effort: "low" });
  });

  it("returns empty object for claude-haiku-4-5 (no adaptive support)", () => {
    const r = reasoning("claude-haiku-4-5", "high");
    expect(r).toEqual({});
  });

  it("returns empty object for claude-sonnet-4-5 (older sonnet)", () => {
    const r = reasoning("claude-sonnet-4-5", "medium");
    expect(r).toEqual({});
  });

  it("handles future claude-opus-4-9 correctly", () => {
    const r = reasoning("claude-opus-4-9", "high");
    expect(r.thinking).toEqual({ type: "adaptive" });
  });

  it("handles future claude-opus-4-10 correctly", () => {
    const r = reasoning("claude-opus-4-10", "high");
    expect(r.thinking).toEqual({ type: "adaptive" });
  });

  it("returns empty for unrecognized model strings", () => {
    expect(reasoning("gpt-4o", "medium")).toEqual({});
    expect(reasoning("", "medium")).toEqual({});
  });
});
