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
import type { Assessment, DynamicCriterion } from "../lib/types";

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
  it("clamps to 0-100", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(101)).toBe(100);
    expect(clamp(50)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(49.6)).toBe(50);
    expect(clamp(49.4)).toBe(49);
  });

  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
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
  it("extracts and clamps all dimension scores", () => {
    const scores = dimensionScores({
      clarity: dim(85),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("k1", 110), dynDim("k2", -5)],
    });
    expect(scores).toEqual([85, 70, 100, 0]);
  });
});

describe("isReady", () => {
  it("passes when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("fails when overall < threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });

  it("fails when any score is below the floor (65)", () => {
    expect(isReady(80, [80, 64, 80], 80)).toBe(false);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const rawBase: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "App",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("k1", 90)],
    refinedPrompt: "build it",
  };

  it("computes overall as mean of all scores", () => {
    const result = finalizeAssessment(rawBase);
    expect(result.overall).toBe(Math.round((85 + 75 + 90) / 3));
  });

  it("sets ready based on threshold, not model output", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.ready).toBe(result.overall >= 80);
    expect(result.threshold).toBe(80);
  });

  it("clamps scores that are out of range", () => {
    const result = finalizeAssessment({
      ...rawBase,
      clarity: dim(150),
      conciseness: dim(-10),
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(rawBase);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates criteria by key", () => {
    const items = [dynDim("k1", 80), dynDim("k1", 90), dynDim("k2", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["k1", "k2"]);
    expect(result[0].score).toBe(80); // first occurrence wins
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = [dynDim("a", 80), dynDim("b", 70), dynDim("c", 60), dynDim("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order and keys", () => {
    const prior = [
      { key: "k1", label: "K1", bestPractice: "bp1" },
      { key: "k2", label: "K2", bestPractice: "bp2" },
    ];
    const items = [dynDim("k2", 70), dynDim("k1", 80)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("k1");
    expect(result[1].key).toBe("k2");
  });

  it("preserves prior labels and bestPractice even when model omits them", () => {
    const prior = [{ key: "k1", label: "My Label", bestPractice: "My BP" }];
    const items = [dynDim("k1", 85)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("My Label");
    expect(result[0].bestPractice).toBe("My BP");
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as unknown as undefined, null)).toEqual([]);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD defaults to 80 without env override", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
