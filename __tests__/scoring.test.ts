import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps to 0 for negative", () => expect(clamp(-5)).toBe(0));
  it("clamps to 100 for values above 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(74.6)).toBe(75));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through mid-range values", () => expect(clamp(42)).toBe(42));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value for one score", () => expect(computeOverall([80])).toBe(80));
  it("averages correctly", () => expect(computeOverall([60, 80, 100])).toBe(80));
  it("rounds to nearest integer", () => expect(computeOverall([60, 61])).toBe(61));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [80, 80, 80], 80)).toBe(false));
  it("returns false when any score is below the floor", () =>
    expect(isReady(80, [80, 64, 80], 80)).toBe(false));
  it("returns true when overall meets threshold and all scores clear the floor", () =>
    expect(isReady(80, [80, 65, 80], 80)).toBe(true));
  it("respects custom threshold", () =>
    expect(isReady(70, [70, 70, 70], 65)).toBe(true));
});

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores in order", () => {
    const result = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("k1", 90), dynDim("k2", 60)],
    });
    expect(result).toEqual([70, 80, 90, 60]);
  });
  it("clamps out-of-range scores", () => {
    const result = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const rawBase = {
    projectType: "Web app",
    clarity: dim(70),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("define_audience", 75)],
    refinedPrompt: "Build a thing",
  };

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(rawBase, 80);
    expect(a.overall).toBe(Math.round((70 + 80 + 75) / 3));
  });

  it("sets ready=false when overall < threshold", () => {
    const a = finalizeAssessment(rawBase, 80);
    expect(a.ready).toBe(false);
  });

  it("sets ready=true when all conditions met", () => {
    const high = {
      ...rawBase,
      clarity: dim(90),
      conciseness: dim(90),
      dynamicCriteria: [dynDim("define_audience", 90)],
    };
    const a = finalizeAssessment(high, 80);
    expect(a.ready).toBe(true);
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(rawBase, 75);
    expect(a.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const a = finalizeAssessment(rawBase);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("clarity", 70),
    dynDim("scope", 80),
    dynDim("scope", 85), // duplicate — second should be ignored
  ];

  it("dedupes by key on first assessment", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["clarity", "scope"]);
  });

  it("caps to 3 items on first assessment", () => {
    const many = ["a", "b", "c", "d"].map((k) => dynDim(k, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
      { key: "clarity", label: "Clarity", bestPractice: "be_clear_and_direct" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["scope", "clarity"]);
    expect(result[0].score).toBe(80); // picks the score from the matching item
  });

  it("returns empty array for undefined/null input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80 by default", () => expect(DEFAULT_THRESHOLD).toBe(80));
  it("DIMENSION_FLOOR is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
