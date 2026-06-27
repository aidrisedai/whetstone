import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps negative numbers to 0", () => expect(clamp(-1)).toBe(0));
  it("clamps numbers above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds decimals", () => expect(clamp(74.6)).toBe(75));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles exact boundaries", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores", () => expect(computeOverall([80, 90])).toBe(85));
  it("rounds correctly", () => expect(computeOverall([80, 81])).toBe(81));
  it("handles single score", () => expect(computeOverall([72])).toBe(72));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("x", 60)],
    });
    expect(scores).toEqual([80, 70, 60]);
  });

  it("clamps raw scores", () => {
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79], 80)).toBe(false);
  });

  it("returns false when a dimension is below the floor", () => {
    expect(isReady(85, [85, 60], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(80, [80, 80], 80)).toBe(true);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("uses DIMENSION_FLOOR as the per-dimension minimum", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR - 1], 80)).toBe(false);
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "app",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("a", 80)],
    refinedPrompt: "test",
  };

  it("computes overall correctly", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 80) / 3));
  });

  it("sets ready based on threshold, not model output", () => {
    const high = finalizeAssessment({ ...base, clarity: dim(90), conciseness: dim(90), dynamicCriteria: [dynDim("a", 90)] }, 80);
    expect(high.ready).toBe(true);
    const low = finalizeAssessment({ ...base, clarity: dim(50), conciseness: dim(50), dynamicCriteria: [dynDim("a", 50)] }, 80);
    expect(low.ready).toBe(false);
  });

  it("clamps out-of-range model scores", () => {
    const result = finalizeAssessment({
      ...base,
      clarity: dim(150),
      conciseness: dim(-10),
      dynamicCriteria: [],
    }, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps threshold on the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key", () => {
    const items = [dynDim("a", 80), dynDim("a", 90), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(clamp(80)); // first occurrence wins
  });

  it("caps to 3 on first assessment", () => {
    const items = [dynDim("a", 80), dynDim("b", 70), dynDim("c", 60), dynDim("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior order when prior is provided", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "bp" },
      { key: "a", label: "A", bestPractice: "bp" },
    ];
    const items = [dynDim("a", 80), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "a"]);
  });

  it("handles undefined/empty items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("uses prior label/bestPractice over model output", () => {
    const prior = [{ key: "a", label: "Fixed Label", bestPractice: "bp-fixed" }];
    const items = [{ ...dynDim("a", 80), label: "Model Label", bestPractice: "bp-model" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Fixed Label");
    expect(result[0].bestPractice).toBe("bp-fixed");
  });
});
