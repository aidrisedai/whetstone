import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

describe("clamp", () => {
  it("keeps values in [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-5)).toBe(0);
    expect(clamp(150)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(72.4)).toBe(72);
    expect(clamp(72.6)).toBe(73);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    // @ts-expect-error testing runtime guard
    expect(clamp("hello")).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });
});

describe("isReady", () => {
  it("is ready when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(85, [80, 85, 90], 80)).toBe(true);
  });

  it("is not ready when overall is below threshold", () => {
    expect(isReady(79, [80, 85, 90], 80)).toBe(false);
  });

  it("is not ready when any score is below DIMENSION_FLOOR", () => {
    const low = DIMENSION_FLOOR - 1;
    expect(isReady(85, [85, 85, low], 80)).toBe(false);
  });

  it("is not ready with an empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "app",
    clarity: { score: 120, rationale: "r", suggestion: "s" },
    conciseness: { score: -10, rationale: "r", suggestion: "s" },
    dynamicCriteria: [
      { key: "k1", label: "L1", bestPractice: "bp", score: 80, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "build it",
  };

  it("clamps all scores", () => {
    const result = finalizeAssessment(base);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.dynamicCriteria[0].score).toBe(80);
  });

  it("computes overall as the mean of all dimensions", () => {
    const result = finalizeAssessment(base);
    expect(result.overall).toBe(Math.round((100 + 0 + 80) / 3));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "a", label: "A", bestPractice: "bp", score: 70, rationale: "r", suggestion: "s" },
    { key: "b", label: "B", bestPractice: "bp", score: 80, rationale: "r", suggestion: "s" },
    { key: "a", label: "A-dup", bestPractice: "bp", score: 90, rationale: "r", suggestion: "s" },
    { key: "c", label: "C", bestPractice: "bp", score: 60, rationale: "r", suggestion: "s" },
  ];

  it("deduplicates by key (first occurrence wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    const keys = result.map((d) => d.key);
    expect(keys).toEqual(["a", "b", "c"]);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items when there is no prior", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to the prior spec set when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp" },
      { key: "a", label: "A", bestPractice: "bp" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["b", "a"]);
    expect(result.length).toBe(2);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    // @ts-expect-error testing runtime guard
    expect(normalizeDynamicCriteria(null, null)).toEqual([]);
  });
});
