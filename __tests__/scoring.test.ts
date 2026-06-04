import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

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
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds decimals", () => expect(clamp(74.6)).toBe(75));
  it("passes through valid values", () => expect(clamp(80)).toBe(80));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages correctly", () => expect(computeOverall([60, 80, 100])).toBe(80));
  it("rounds the mean", () => expect(computeOverall([67, 68])).toBe(68));
});

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores in order", () => {
    const result = dimensionScores({
      clarity: dim(75),
      conciseness: dim(85),
      dynamicCriteria: [dynDim("a", 65), dynDim("b", 70)],
    });
    expect(result).toEqual([75, 85, 65, 70]);
  });
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns false when overall below threshold", () =>
    expect(isReady(79, [80, 80, 80], 80)).toBe(false));
  it("returns false when a dimension is below the floor", () =>
    expect(isReady(85, [90, 90, 60], 80)).toBe(false));
  it("returns true when overall meets threshold and all dimensions clear the floor", () =>
    expect(isReady(80, [80, 80, 70], 80)).toBe(true));
});

describe("finalizeAssessment", () => {
  it("clamps scores, computes overall, and stamps ready + threshold", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: dim(110),
      conciseness: dim(90),
      dynamicCriteria: [dynDim("define_audience", 82)],
      refinedPrompt: "Build it",
    });
    expect(result.clarity.score).toBe(100); // clamped
    expect(result.overall).toBe(Math.round((100 + 90 + 82) / 3));
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
    expect(typeof result.ready).toBe("boolean");
  });
});

describe("normalizeDynamicCriteria", () => {
  const spec: CriterionSpec[] = [
    { key: "a", label: "A", bestPractice: "a" },
    { key: "b", label: "B", bestPractice: "b" },
  ];

  it("dedupes by key on first assessment", () => {
    const items = [dynDim("a", 70), dynDim("a", 80), dynDim("b", 75)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on first assessment", () => {
    const items = [dynDim("a", 70), dynDim("b", 75), dynDim("c", 60), dynDim("d", 55)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior spec order on subsequent assessments", () => {
    const items = [dynDim("b", 80), dynDim("a", 60)];
    const result = normalizeDynamicCriteria(items, spec);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(60);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(80);
  });

  it("returns empty list for undefined input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("clamps scores when locking to prior spec", () => {
    const items = [dynDim("a", 150), dynDim("b", -10)];
    const result = normalizeDynamicCriteria(items, spec);
    expect(result[0].score).toBe(100);
    expect(result[1].score).toBe(0);
  });

  it("exports DIMENSION_FLOOR as 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
