import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

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
  it("clamps values to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
    expect(clamp(-1)).toBe(0);
    expect(clamp(101)).toBe(100);
  });

  it("rounds floats", () => {
    expect(clamp(74.5)).toBe(75);
    expect(clamp(74.4)).toBe(74);
  });

  it("treats NaN as 0", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("handles non-numbers", () => {
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("averages scores", () => {
    expect(computeOverall([80, 60, 40])).toBe(60);
  });

  it("rounds to nearest integer", () => {
    expect(computeOverall([67, 68])).toBe(68);
  });

  it("handles single score", () => {
    expect(computeOverall([75])).toBe(75);
  });
});

describe("isReady", () => {
  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all above floor", () => {
    expect(isReady(82, [82, 75, 70], 80)).toBe(true);
  });

  it("returns false when overall below threshold", () => {
    expect(isReady(79, [79, 80, 80], 80)).toBe(false);
  });

  it("returns false when a dimension is below the floor", () => {
    expect(isReady(85, [90, 90, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });

  it("returns true when a dimension is exactly at the floor", () => {
    expect(isReady(85, [90, 90, DIMENSION_FLOOR], 80)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores", () => {
    const result = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 60)],
    });
    expect(result).toEqual([80, 70, 60]);
  });

  it("clamps all scores", () => {
    const result = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key, keeping first occurrence", () => {
    const items = [dynDim("a", 80), dynDim("a", 60), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = [dynDim("a", 80), dynDim("b", 70), dynDim("c", 60), dynDim("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria keys in order", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "bp" },
      { key: "a", label: "A", bestPractice: "bp" },
    ];
    const items = [dynDim("a", 90), dynDim("b", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(90);
  });

  it("handles undefined items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("finalizeAssessment", () => {
  const rawBase = {
    projectType: "game",
    clarity: dim(80),
    conciseness: dim(90),
    dynamicCriteria: [dynDim("originality", 75)],
    refinedPrompt: "Build a platformer",
  };

  it("computes overall as mean of clamped scores", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.overall).toBe(Math.round((80 + 90 + 75) / 3));
  });

  it("marks ready when threshold met and floor cleared", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.ready).toBe(true);
  });

  it("marks not ready when overall below threshold", () => {
    const result = finalizeAssessment({ ...rawBase, clarity: dim(50), conciseness: dim(50) }, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(rawBase, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps scores that exceed 100", () => {
    const result = finalizeAssessment({ ...rawBase, clarity: dim(999) }, 80);
    expect(result.clarity.score).toBe(100);
  });
});
