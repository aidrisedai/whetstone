import { describe, it, expect } from "vitest";
import { reasoning } from "@/lib/anthropic";

describe("reasoning / supportsAdaptiveEffort", () => {
  it("enables adaptive effort for Opus 4.5+", () => {
    for (const minor of ["5", "6", "7", "8", "9", "10"]) {
      const r = reasoning(`claude-opus-4-${minor}`, "medium");
      expect(r).toHaveProperty("thinking", { type: "adaptive" });
      expect(r.output_config?.effort).toBe("medium");
    }
  });

  it("does NOT enable adaptive effort for Opus 4.4 or earlier", () => {
    const r = reasoning("claude-opus-4-4", "medium");
    expect(r).toEqual({});
  });

  it("enables adaptive effort for Sonnet 4.6+", () => {
    for (const minor of ["6", "7", "8"]) {
      const r = reasoning(`claude-sonnet-4-${minor}`, "high");
      expect(r).toHaveProperty("thinking", { type: "adaptive" });
    }
  });

  it("does NOT enable adaptive effort for Sonnet 4.5 or earlier", () => {
    const r = reasoning("claude-sonnet-4-5", "high");
    expect(r).toEqual({});
  });

  it("does NOT enable adaptive effort for Haiku models", () => {
    const r = reasoning("claude-haiku-4-5", "low");
    expect(r).toEqual({});
  });

  it("passes the effort level through", () => {
    const r = reasoning("claude-opus-4-8", "low");
    expect(r.output_config?.effort).toBe("low");
    const r2 = reasoning("claude-opus-4-8", "high");
    expect(r2.output_config?.effort).toBe("high");
  });
});
