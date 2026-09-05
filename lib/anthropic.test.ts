import { describe, expect, it } from "vitest";
import { reasoning, supportsAdaptiveEffort } from "./anthropic";

/**
 * The reasoning gate decides whether a request carries adaptive thinking and an
 * `effort` setting. Getting it wrong is silent in both directions: too narrow
 * and a current model quietly loses effort control; too wide and the API 400s
 * on a model that rejects the parameters. So pin the matrix explicitly.
 */
describe("supportsAdaptiveEffort", () => {
  const supported = [
    "claude-opus-5",
    "claude-sonnet-5",
    "claude-fable-5",
    "claude-mythos-5",
    "claude-opus-4-8",
    "claude-opus-4-7",
    "claude-opus-4-6",
    "claude-opus-4-5",
    "claude-sonnet-4-6",
  ];

  const unsupported = [
    "claude-haiku-4-5",
    "claude-sonnet-4-5",
    "claude-opus-4-1",
    "claude-3-5-sonnet",
  ];

  it.each(supported)("enables adaptive thinking + effort on %s", (model) => {
    expect(supportsAdaptiveEffort(model)).toBe(true);
  });

  it.each(unsupported)("stays lean on %s", (model) => {
    expect(supportsAdaptiveEffort(model)).toBe(false);
  });
});

describe("reasoning", () => {
  it("returns adaptive thinking and the requested effort for a capable model", () => {
    expect(reasoning("claude-opus-5", "medium")).toEqual({
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
    });
  });

  it("returns an empty config for a model that rejects the parameters", () => {
    expect(reasoning("claude-haiku-4-5", "high")).toEqual({});
  });

  it("passes the effort level through unchanged", () => {
    expect(reasoning("claude-sonnet-4-6", "low").output_config).toEqual({ effort: "low" });
  });
});
