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
} from "./scoring";
import type { Assessment, DynamicCriterion, CriterionSpec } from "./types";

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
  it("clamps values between 0 and 100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(NaN)).toBe(0);
    // @ts-expect-error — testing runtime safety
    expect(clamp("foo")).toBe(0);
  });

  it("rounds fractional scores", () => {
    expect(clamp(75.4)).toBe(75);
    expect(clamp(75.6)).toBe(76);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 60, 70])).toBe(70);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the mean", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria scores", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 90), dynDim("b", 60)],
    });
    expect(scores).toEqual([80, 70, 90, 60]);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dimensions clear floor", () => {
    expect(isReady(85, [85, 80, 90], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 80, 90], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor", () => {
    expect(isReady(85, [85, 80, 60], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("defaults to 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});

describe("finalizeAssessment", () => {
  const rawBase = {
    projectType: "App",
    clarity: dim(72),
    conciseness: dim(68),
    dynamicCriteria: [dynDim("specificity", 85)],
    refinedPrompt: "Build a todo app",
  };

  it("clamps all scores and computes overall deterministically", () => {
    const result = finalizeAssessment({
      ...rawBase,
      clarity: dim(150),
      conciseness: dim(-5),
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("sets ready=true when score meets threshold", () => {
    const result = finalizeAssessment({
      ...rawBase,
      clarity: dim(90),
      conciseness: dim(85),
      dynamicCriteria: [dynDim("specificity", 88)],
    });
    expect(result.ready).toBe(true);
    expect(result.overall).toBeGreaterThanOrEqual(80);
  });

  it("sets ready=false when score is below threshold", () => {
    const result = finalizeAssessment({
      ...rawBase,
      clarity: dim(50),
      conciseness: dim(50),
      dynamicCriteria: [dynDim("specificity", 50)],
    });
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(rawBase, 70);
    expect(result.threshold).toBe(70);
  });

  it("uses DEFAULT_THRESHOLD when not provided", () => {
    const result = finalizeAssessment(rawBase);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key", () => {
    const items = [dynDim("a", 80), dynDim("a", 90), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 on first assessment", () => {
    const items = [dynDim("a", 80), dynDim("b", 70), dynDim("c", 60), dynDim("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks criteria order when prior specs are provided", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp" },
      { key: "a", label: "A", bestPractice: "bp" },
    ];
    const items = [dynDim("a", 80), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(70);
  });

  it("returns empty array for undefined input", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
