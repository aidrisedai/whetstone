import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynCrit = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps to 0–100 range", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(75.6)).toBe(76);
    expect(clamp(75.4)).toBe(75);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the value for a single score", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("averages scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("rounds to nearest integer", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });
});

describe("isReady", () => {
  it("returns false when scores array is empty", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 80, 80], 80)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    const low = DIMENSION_FLOOR - 1;
    expect(isReady(85, [85, low, 85], 80)).toBe(false);
  });

  it("requires both conditions to be true", () => {
    expect(isReady(85, [85, 85, 85], 80)).toBe(true);
    // DIMENSION_FLOOR is 65 and the check is >=, so 64 is the first failing value
    expect(isReady(85, [64, 85, 85], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("returns clamped scores from clarity, conciseness, and dynamic criteria", () => {
    const result = dimensionScores({
      clarity: dim(75),
      conciseness: dim(80),
      dynamicCriteria: [dynCrit("a", 70), dynCrit("b", 65)],
    });
    expect(result).toEqual([75, 80, 70, 65]);
  });

  it("clamps scores outside 0–100 range", () => {
    const result = dimensionScores({
      clarity: dim(-5),
      conciseness: dim(110),
      dynamicCriteria: [],
    });
    expect(result).toEqual([0, 100]);
  });
});

describe("finalizeAssessment", () => {
  const rawBase = {
    projectType: "app",
    clarity: dim(75),
    conciseness: dim(85),
    dynamicCriteria: [dynCrit("originality", 70)],
    refinedPrompt: "Build a habit tracker for teens",
  };

  it("computes overall as the mean of all dimensions", () => {
    const result = finalizeAssessment(rawBase, 80);
    // (75 + 85 + 70) / 3 = 76.67 → 77
    expect(result.overall).toBe(77);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(rawBase, 90);
    expect(result.threshold).toBe(90);
  });

  it("marks ready=false when below threshold", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.ready).toBe(false);
  });

  it("marks ready=true when above threshold and all dims clear the floor", () => {
    const highRaw = {
      ...rawBase,
      clarity: dim(90),
      conciseness: dim(90),
      dynamicCriteria: [dynCrit("k", 90)],
    };
    const result = finalizeAssessment(highRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("clamps scores that are out of range", () => {
    const rawOutOfRange = {
      ...rawBase,
      clarity: dim(-20),
      conciseness: dim(150),
    };
    const result = finalizeAssessment(rawOutOfRange);
    expect(result.clarity.score).toBe(0);
    expect(result.conciseness.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "originality", label: "Originality", bestPractice: "bp1" },
    { key: "feasibility", label: "Feasibility", bestPractice: "bp2" },
  ];

  it("deduplicates by key on first pass (no prior)", () => {
    const items: DynamicCriterion[] = [
      dynCrit("a", 70),
      dynCrit("a", 80), // duplicate — first wins
      dynCrit("b", 60),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first pass", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynCrit(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs when provided", () => {
    const items: DynamicCriterion[] = [
      { ...dynCrit("originality", 85), label: "ignored", bestPractice: "ignored" },
      dynCrit("feasibility", 78),
    ];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result).toHaveLength(2);
    // Labels and bestPractice come from the spec, not the item
    expect(result[0].label).toBe("Originality");
    expect(result[0].bestPractice).toBe("bp1");
    expect(result[0].score).toBe(85);
    expect(result[1].score).toBe(78);
  });

  it("returns empty array for undefined input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("returns stable zeros when prior keys are missing from items", () => {
    const result = normalizeDynamicCriteria([], specs);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(0);
    expect(result[1].score).toBe(0);
  });
});
