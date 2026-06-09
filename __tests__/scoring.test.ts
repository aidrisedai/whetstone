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
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "be_clear_and_direct",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps below zero to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds floats", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through valid scores", () => expect(clamp(55)).toBe(55));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("computes mean correctly", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([67, 68])).toBe(68));
  it("handles a single score", () => expect(computeOverall([42])).toBe(42));
});

describe("isReady", () => {
  it("requires overall >= threshold", () =>
    expect(isReady(79, [79, 79], 80)).toBe(false));
  it("passes when overall meets threshold and all dims clear floor", () =>
    expect(isReady(80, [80, 80], 80)).toBe(true));
  it("fails when any dim is below DIMENSION_FLOOR", () =>
    expect(isReady(85, [85, 64], 80)).toBe(false));
  it("requires at least one score", () =>
    expect(isReady(90, [], 80)).toBe(false));
  it("passes exactly at DIMENSION_FLOOR", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("k1", 90)],
    });
    expect(scores).toEqual([70, 80, 90]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: dim(200),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "Web App",
    clarity: dim(70),
    conciseness: dim(90),
    dynamicCriteria: [dynDim("k1", 80)],
    refinedPrompt: "Build a thing",
  };

  it("computes overall as the mean", () => {
    const result = finalizeAssessment(baseRaw);
    expect(result.overall).toBe(Math.round((70 + 90 + 80) / 3));
  });

  it("sets ready=false when below threshold", () => {
    const result = finalizeAssessment({ ...baseRaw, clarity: dim(50), conciseness: dim(50) }, 80);
    expect(result.ready).toBe(false);
  });

  it("sets ready=true when all conditions met", () => {
    const high = {
      ...baseRaw,
      clarity: dim(85),
      conciseness: dim(85),
      dynamicCriteria: [dynDim("k1", 85)],
    };
    const result = finalizeAssessment(high, 80);
    expect(result.ready).toBe(true);
  });

  it("stamps the threshold onto the result", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key (first occurrence wins)", () => {
    const items: DynamicCriterion[] = [
      dynDim("dup", 50),
      dynDim("dup", 70),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(50);
  });

  it("caps at 3 on first assessment", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynDim(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior keys when prior is set", () => {
    const prior = [
      { key: "k1", label: "L1", bestPractice: "be_clear_and_direct" },
      { key: "k2", label: "L2", bestPractice: "provide_context" },
    ];
    const items = [dynDim("k2", 75), dynDim("k1", 65), dynDim("k3", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["k1", "k2"]);
    expect(result[0].score).toBe(65);
    expect(result[1].score).toBe(75);
  });

  it("handles undefined/empty items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80 when env is unset", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
