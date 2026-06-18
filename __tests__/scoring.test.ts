import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

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
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("clamps below 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100", () => expect(clamp(120)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("passes through valid values", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores", () => expect(computeOverall([70, 90])).toBe(80));
  it("rounds the mean", () => expect(computeOverall([70, 71])).toBe(71));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("specificity", 60)],
    });
    expect(scores).toEqual([80, 70, 60]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("requires overall >= threshold AND all scores >= floor", () => {
    expect(isReady(80, [80, 70, 68], 80)).toBe(true);
  });

  it("fails when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it(`fails when any score is below DIMENSION_FLOOR (${DIMENSION_FLOOR})`, () => {
    expect(isReady(85, [85, 85, 64], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: dim(75),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("specificity", 70)],
    refinedPrompt: "refined prompt",
  };

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.overall).toBe(Math.round((75 + 80 + 70) / 3));
  });

  it("sets ready correctly when threshold is met", () => {
    const a = finalizeAssessment({ ...base, clarity: dim(85), conciseness: dim(85), dynamicCriteria: [dynDim("x", 85)] }, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready false when a dimension is below the floor", () => {
    const a = finalizeAssessment({ ...base, clarity: dim(60) }, 80);
    expect(a.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const a = finalizeAssessment(base, 75);
    expect(a.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("specificity", 70),
    dynDim("audience", 80),
    dynDim("specificity", 90), // duplicate key
  ];

  it("deduplicates by key (first wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["specificity", "audience"]);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items on first call (no prior)", () => {
    const many = Array.from({ length: 5 }, (_, i) => dynDim(`k${i}`, 70));
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("locks to prior keys in order when prior is set", () => {
    const prior = [
      { key: "audience", label: "Audience", bestPractice: "bp" },
      { key: "specificity", label: "Specificity", bestPractice: "bp" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["audience", "specificity"]);
    expect(result[0].label).toBe("Audience"); // label from prior, not model
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
