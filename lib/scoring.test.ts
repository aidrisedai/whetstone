import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "./scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "./types";

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
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds fractional scores", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through in-range values", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("computes the mean", () => expect(computeOverall([80, 90, 70])).toBe(80));
  it("rounds the mean", () => expect(computeOverall([81, 82])).toBe(82));
});

describe("isReady", () => {
  it("requires overall >= threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });

  it("requires every dimension >= DIMENSION_FLOOR (65)", () => {
    expect(isReady(85, [85, 85, 64], 80)).toBe(false);
    expect(isReady(85, [85, 85, 65], 80)).toBe(true);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("a high overall cannot carry a dimension below the floor", () => {
    expect(isReady(100, [100, 100, 60], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 60), dynDim("b", 90)],
    });
    expect(scores).toEqual([80, 70, 60, 90]);
  });

  it("clamps out-of-range scores", () => {
    const scores = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("audience", 75)],
    refinedPrompt: "Build something great",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((85 + 80 + 75) / 3));
  });

  it("sets ready=true when overall and all dims clear thresholds", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low: typeof base = {
      ...base,
      clarity: dim(50),
      conciseness: dim(50),
      dynamicCriteria: [dynDim("audience", 50)],
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores before computing", () => {
    const wild: typeof base = {
      ...base,
      clarity: dim(200),
      conciseness: dim(-10),
      dynamicCriteria: [],
    };
    const result = finalizeAssessment(wild, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(50);
  });

  it("uses DEFAULT_THRESHOLD when none is passed", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const criteria: DynamicCriterion[] = [
    dynDim("clarity", 70),
    dynDim("audience", 80),
  ];

  it("deduplicates by key (first occurrence wins)", () => {
    const dup = [...criteria, dynDim("clarity", 90)];
    const result = normalizeDynamicCriteria(dup, null);
    expect(result.filter((d) => d.key === "clarity")).toHaveLength(1);
    expect(result.find((d) => d.key === "clarity")?.score).toBe(70);
  });

  it("caps to 3 dimensions on the first assessment (no prior)", () => {
    const many = [
      dynDim("a", 70), dynDim("b", 80), dynDim("c", 75), dynDim("d", 65),
    ];
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("locks to the prior spec order when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
      { key: "clarity", label: "Clarity", bestPractice: "clarity" },
    ];
    const result = normalizeDynamicCriteria(criteria, prior);
    expect(result.map((d) => d.key)).toEqual(["audience", "clarity"]);
  });

  it("returns stable labels from prior spec, not the model echo", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Stable Label", bestPractice: "define_audience" },
    ];
    const drifted = [dynDim("audience", 80)];
    const result = normalizeDynamicCriteria(drifted, prior);
    expect(result[0].label).toBe("Stable Label");
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("falls back to positional match when key is missing from model reply", () => {
    const prior: CriterionSpec[] = [
      { key: "missing_key", label: "Missing", bestPractice: "x" },
    ];
    const fallback = [dynDim("other_key", 55)];
    const result = normalizeDynamicCriteria(fallback, prior);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("missing_key");
    expect(result[0].score).toBe(55);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is a valid integer between 1 and 100", () => {
    expect(Number.isInteger(DEFAULT_THRESHOLD)).toBe(true);
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(100);
  });

  it("DIMENSION_FLOOR is below DEFAULT_THRESHOLD", () => {
    expect(DIMENSION_FLOOR).toBeLessThan(DEFAULT_THRESHOLD);
  });
});
