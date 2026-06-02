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
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

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
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("handles NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes valid values through", () => expect(clamp(80)).toBe(80));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages correctly", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([67, 68])).toBe(68));
  it("handles single value", () => expect(computeOverall([55])).toBe(55));
});

describe("isReady", () => {
  it("requires overall >= threshold", () => {
    expect(isReady(79, [79, 79], 80)).toBe(false);
    expect(isReady(80, [80, 80], 80)).toBe(true);
  });
  it("requires every dimension >= DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 64], 80)).toBe(false);
    expect(isReady(85, [85, 65], 80)).toBe(true);
  });
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
});

describe("dimensionScores", () => {
  it("collects fixed + dynamic scores, clamped", () => {
    const scores = dimensionScores({
      clarity: dim(90),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("a", 70), dynDim("b", 110)],
    });
    expect(scores).toEqual([90, 80, 70, 100]);
  });
});

describe("finalizeAssessment", () => {
  it("computes overall and ready flag deterministically", () => {
    const raw = {
      projectType: "App",
      clarity: dim(85),
      conciseness: dim(75),
      dynamicCriteria: [dynDim("define_audience", 80)],
      refinedPrompt: "Build something.",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 80) / 3));
    expect(result.ready).toBe(result.overall >= 80 && 75 >= DIMENSION_FLOOR);
    expect(result.threshold).toBe(80);
  });

  it("clamps individual dimension scores", () => {
    const raw = {
      projectType: "App",
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
      refinedPrompt: "Build.",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("never sets ready=true when a dimension is below DIMENSION_FLOOR", () => {
    const raw = {
      projectType: "App",
      clarity: dim(100),
      conciseness: dim(100),
      dynamicCriteria: [dynDim("k", 60)],
      refinedPrompt: "Build.",
    };
    expect(finalizeAssessment(raw, 80).ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first assessment", () => {
    const items: DynamicCriterion[] = [dynDim("a", 70), dynDim("a", 80), dynDim("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first assessment", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynDim(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria set after first assessment", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "A", bestPractice: "a" },
      { key: "b", label: "B", bestPractice: "b" },
    ];
    const items: DynamicCriterion[] = [dynDim("b", 90), dynDim("a", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(90);
  });

  it("handles undefined input gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("exports sensible defaults", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
