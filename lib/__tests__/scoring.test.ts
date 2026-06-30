import { describe, it, expect } from "vitest";
import {
  clamp,
  dimensionScores,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

function dim(score: number) {
  return { score, rationale: "r", suggestion: "s" };
}

function dynCrit(key: string, score: number): DynamicCriterion {
  return { key, label: key, bestPractice: "bp", score, rationale: "r", suggestion: "s" };
}

describe("clamp", () => {
  it("clamps values to 0-100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(50)).toBe(50);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number", () => {
    expect(clamp("fifty" as unknown as number)).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("extracts and clamps all dimension scores", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynCrit("a", 110), dynCrit("b", -5)],
    });
    expect(scores).toEqual([80, 70, 100, 0]);
  });

  it("works with no dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(90),
      conciseness: dim(60),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([90, 60]);
  });
});

describe("computeOverall", () => {
  it("computes the mean", () => {
    expect(computeOverall([80, 60, 100])).toBe(80);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the mean", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores exceed floor", () => {
    expect(isReady(85, [70, 80, 90], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(70, [70, 80, 90], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [64, 80, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("floor boundary: exactly DIMENSION_FLOOR passes", () => {
    expect(isReady(85, [DIMENSION_FLOOR, 90], 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const rawBase = {
    projectType: "game",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynCrit("depth", 90)],
    refinedPrompt: "A cool game",
  };

  it("computes overall from clamped scores", () => {
    const result = finalizeAssessment(rawBase);
    expect(result.overall).toBe(Math.round((85 + 75 + 90) / 3));
  });

  it("sets ready deterministically based on threshold", () => {
    const result = finalizeAssessment(rawBase, 80);
    const expectedOverall = Math.round((85 + 75 + 90) / 3);
    expect(result.ready).toBe(expectedOverall >= 80 && Math.min(85, 75, 90) >= DIMENSION_FLOOR);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(rawBase, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment({
      ...rawBase,
      clarity: dim(150),
      conciseness: dim(-20),
      dynamicCriteria: [],
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(rawBase);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first assessment (no prior)", () => {
    const items = [dynCrit("a", 80), dynCrit("a", 70), dynCrit("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("caps to 3 on first assessment", () => {
    const items = [
      dynCrit("a", 80),
      dynCrit("b", 70),
      dynCrit("c", 60),
      dynCrit("d", 50),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior order when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp" },
      { key: "a", label: "A", bestPractice: "bp" },
    ];
    const items = [dynCrit("a", 80), dynCrit("b", 60)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "a"]);
    expect(result.map((r) => r.score)).toEqual([60, 80]);
  });

  it("preserves prior labels even if model sends different ones", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "Locked Label", bestPractice: "bp" },
    ];
    const items = [{ ...dynCrit("x", 75), label: "Different Label" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Locked Label");
  });

  it("handles undefined/null input gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
