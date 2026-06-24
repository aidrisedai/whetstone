import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes valid scores through", () => expect(clamp(75)).toBe(75));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores", () => expect(computeOverall([80, 60, 100])).toBe(80));
  it("rounds the result", () => expect(computeOverall([70, 71])).toBe(71));
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [79, 79, 79], 80)).toBe(false));
  it("returns false when any dimension is below floor", () =>
    expect(isReady(80, [80, 64, 80], 80)).toBe(false));
  it("returns true when overall meets threshold and all dimensions clear floor", () =>
    expect(isReady(80, [80, 65, 90], 80)).toBe(true));
  it("returns false for empty scores array", () =>
    expect(isReady(80, [], 80)).toBe(false));
});

describe("normalizeDynamicCriteria", () => {
  const makeCrit = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "test",
    suggestion: "test",
  });

  it("deduplicates by key", () => {
    const items = [makeCrit("a", 70), makeCrit("a", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 items when no prior criteria", () => {
    const items = [1, 2, 3, 4].map((i) => makeCrit(`k${i}`, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria when provided", () => {
    const items = [makeCrit("a", 75), makeCrit("b", 85)];
    const prior: CriterionSpec[] = [
      { key: "a", label: "Alpha", bestPractice: "bp-a" },
      { key: "b", label: "Beta", bestPractice: "bp-b" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("Alpha"); // locked to prior label
    expect(result[0].score).toBe(75);
    expect(result[1].score).toBe(85);
  });

  it("handles undefined items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});

describe("finalizeAssessment", () => {
  const dimension = { score: 78, rationale: "good", suggestion: "keep going" };
  const raw = {
    projectType: "Game",
    clarity: { ...dimension },
    conciseness: { ...dimension },
    dynamicCriteria: [
      { key: "fun", label: "Fun", bestPractice: "fun", ...dimension },
    ],
    refinedPrompt: "Build a game",
  };

  it("clamps scores and computes overall", () => {
    const result = finalizeAssessment(raw);
    expect(result.overall).toBeGreaterThan(0);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("stamps the provided threshold", () => {
    const result = finalizeAssessment(raw, 60);
    expect(result.threshold).toBe(60);
  });

  it("sets ready correctly based on threshold and floor", () => {
    const high = finalizeAssessment(
      {
        ...raw,
        clarity: { score: 90, rationale: "", suggestion: "" },
        conciseness: { score: 90, rationale: "", suggestion: "" },
        dynamicCriteria: [{ key: "k", label: "K", bestPractice: "bp", score: 90, rationale: "", suggestion: "" }],
      },
      80,
    );
    expect(high.ready).toBe(true);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is between 1 and 100", () => {
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(100);
  });
  it("DIMENSION_FLOOR is between 0 and 100", () => {
    expect(DIMENSION_FLOOR).toBeGreaterThanOrEqual(0);
    expect(DIMENSION_FLOOR).toBeLessThanOrEqual(100);
  });
});
