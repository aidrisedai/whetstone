import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion } from "../types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynCrit = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(74.6)).toBe(75));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes values in range unchanged", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns mean of scores", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("handles single score", () => expect(computeOverall([90])).toBe(90));
  it("rounds result", () => expect(computeOverall([1, 2])).toBe(2));
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores meet floor", () => {
    expect(isReady(85, [85, 70, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [85, 70, 80], 80)).toBe(false);
  });

  it("returns false when any score is below floor", () => {
    expect(isReady(85, [85, 64, 80], 80)).toBe(false);
  });

  it("returns false when exactly at floor (floor is exclusive lower bound check >=)", () => {
    expect(isReady(85, [85, DIMENSION_FLOOR, 80], 80)).toBe(true);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynCrit("a", 90)],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("clamps out-of-range values", () => {
    const scores = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key on first assessment (no prior)", () => {
    const items = [dynCrit("a", 80), dynCrit("a", 90), dynCrit("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first occurrence wins
  });

  it("caps at 3 on first assessment", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynCrit(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior keys on subsequent assessments", () => {
    const prior = [
      { key: "x", label: "X", bestPractice: "bp" },
      { key: "y", label: "Y", bestPractice: "bp" },
    ];
    const items = [dynCrit("x", 85), dynCrit("z", 90)]; // z not in prior
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["x", "y"]);
    expect(result[0].score).toBe(85);
  });

  it("handles undefined items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("finalizeAssessment", () => {
  it("clamps scores and computes overall deterministically", () => {
    const raw = {
      projectType: "Web/SaaS",
      clarity: dim(110),
      conciseness: dim(60),
      dynamicCriteria: [dynCrit("focus", 80)],
      refinedPrompt: "Build X",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(60);
    expect(result.overall).toBe(Math.round((100 + 60 + 80) / 3));
    expect(result.threshold).toBe(80);
  });

  it("sets ready=true only when both overall threshold and floor are met", () => {
    const raw = {
      projectType: "Web/SaaS",
      clarity: dim(85),
      conciseness: dim(80),
      dynamicCriteria: [dynCrit("k", 75)],
      refinedPrompt: "p",
    };
    expect(finalizeAssessment(raw, 80).ready).toBe(true);
  });

  it("sets ready=false when a dimension is below floor", () => {
    const raw = {
      projectType: "Web/SaaS",
      clarity: dim(90),
      conciseness: dim(40),
      dynamicCriteria: [],
      refinedPrompt: "p",
    };
    expect(finalizeAssessment(raw, 80).ready).toBe(false);
  });
});
