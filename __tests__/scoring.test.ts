import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "../lib/types";

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
  it("clamps values within 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(NaN)).toBe(0);
  });

  it("rounds fractional values", () => {
    expect(clamp(49.5)).toBe(50);
    expect(clamp(49.4)).toBe(49);
  });
});

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the average, rounded", () => {
    expect(computeOverall([100, 80, 60])).toBe(80);
    expect(computeOverall([70, 71])).toBe(71);
  });
});

describe("dimensionScores", () => {
  it("includes all fixed and dynamic dimensions", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("define_audience", 65), dynDim("success_criteria", 75)],
    });
    expect(scores).toEqual([80, 70, 65, 75]);
  });

  it("clamps each value", () => {
    const scores = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-5),
      dynamicCriteria: [dynDim("k", NaN)],
    });
    expect(scores).toEqual([100, 0, 0]);
  });
});

describe("isReady", () => {
  it("requires overall >= threshold AND every dimension >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
    expect(isReady(80, [80, 64, 80], 80)).toBe(false);
    expect(isReady(80, [80, 65, 80], 80)).toBe(true);
  });

  it("returns false for an empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(78),
    dynamicCriteria: [dynDim("define_audience", 70), dynDim("success_criteria", 72)],
    refinedPrompt: "Build a tracker.",
  };

  it("stamps overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((85 + 78 + 70 + 72) / 4));
  });

  it("sets ready=true when overall >= threshold and all dims >= DIMENSION_FLOOR", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(result.overall >= 80);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores from the model", () => {
    const messyRaw = { ...raw, clarity: dim(999), conciseness: dim(-50) };
    const result = finalizeAssessment(messyRaw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(raw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
    { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
  ];

  it("deduplicates repeated keys from the model", () => {
    const items: DynamicCriterion[] = [
      dynDim("define_audience", 70),
      dynDim("define_audience", 80),
      dynDim("success_criteria", 65),
    ];
    const result = normalizeDynamicCriteria(items, null);
    const keys = result.map((d) => d.key);
    expect(keys.filter((k) => k === "define_audience").length).toBe(1);
  });

  it("caps to 3 dimensions when there are no prior criteria", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynDim(k, 50));
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to the prior set when provided, preserving keys/labels", () => {
    const items: DynamicCriterion[] = [
      dynDim("define_audience", 77),
      dynDim("success_criteria", 68),
    ];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result.length).toBe(2);
    expect(result[0].key).toBe("define_audience");
    expect(result[0].score).toBe(77);
    expect(result[0].label).toBe("Audience");
    expect(result[1].key).toBe("success_criteria");
  });

  it("falls back to positional match when model drops a criterion key", () => {
    const items: DynamicCriterion[] = [dynDim("something_else", 60), dynDim("another_key", 55)];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].key).toBe("define_audience");
    expect(result[0].score).toBe(60);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("preserves DIMENSION_FLOOR constant at 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
