import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

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
  it("keeps values within 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(NaN)).toBe(0);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the mean", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const result = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("audience", 60)],
    });
    expect(result).toEqual([80, 70, 60]);
  });

  it("clamps out-of-range scores", () => {
    const result = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("passes when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 75, 70], 80)).toBe(true);
  });

  it("fails when overall is below threshold", () => {
    expect(isReady(79, [80, 75, 70], 80)).toBe(false);
  });

  it("fails when any score is below the dimension floor", () => {
    expect(isReady(85, [85, 80, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });

  it("passes exactly at the floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  it("computes overall and ready deterministically", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: dim(90),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("audience", 70)],
      refinedPrompt: "Build something.",
    });
    expect(result.overall).toBe(80); // (90+80+70)/3 = 80
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("marks as not ready when one dimension is below the floor", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: dim(90),
      conciseness: dim(90),
      dynamicCriteria: [dynDim("audience", 60)], // below DIMENSION_FLOOR
      refinedPrompt: "Build something.",
    });
    expect(result.ready).toBe(false);
  });

  it("respects a custom threshold", () => {
    const result = finalizeAssessment(
      {
        projectType: "Web app",
        clarity: dim(70),
        conciseness: dim(70),
        dynamicCriteria: [dynDim("audience", 70)],
        refinedPrompt: "Build something.",
      },
      60,
    );
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(60);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "audience", label: "Audience", bestPractice: "define_audience" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
  ];

  it("deduplicates by key when no prior criteria", () => {
    const items: DynamicCriterion[] = [
      dynDim("audience", 70),
      dynDim("audience", 80), // duplicate
      dynDim("scope", 60),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("locks to prior criteria order and keys", () => {
    const items: DynamicCriterion[] = [
      dynDim("scope", 75),
      dynDim("audience", 65),
    ];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(65);
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(75);
  });

  it("caps to 3 criteria on first assessment (no prior)", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynDim(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
