import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
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
  it("clamps negative to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps over 100 to 100", () => expect(clamp(105)).toBe(100));
  it("rounds decimals", () => expect(clamp(72.6)).toBe(73));
  it("handles NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes valid values through", () => expect(clamp(75)).toBe(75));
  it("handles exact boundary 0", () => expect(clamp(0)).toBe(0));
  it("handles exact boundary 100", () => expect(clamp(100)).toBe(100));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores correctly", () => expect(computeOverall([80, 90])).toBe(85));
  it("rounds the mean", () => expect(computeOverall([80, 81])).toBe(81));
  it("handles single score", () => expect(computeOverall([70])).toBe(70));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 90)],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("clamps out-of-range values", () => {
    const scores = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-10),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(85, [80, 70, 85], 80)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    expect(isReady(75, [80, 70, 80], 80)).toBe(false);
  });

  it("returns false when any score < floor", () => {
    expect(isReady(85, [80, 64, 85], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("passes exactly at floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, 80], 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("scope", 80)],
    refinedPrompt: "Build a todo app.",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 80) / 3));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=true when all conditions met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall below threshold", () => {
    const low = { ...base, clarity: dim(40), conciseness: dim(40), dynamicCriteria: [dynDim("scope", 40)] };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const over = { ...base, clarity: dim(999), conciseness: dim(-5), dynamicCriteria: [] };
    const result = finalizeAssessment(over, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("clarity", 80),
    dynDim("scope", 70),
    dynDim("clarity", 90), // duplicate key
  ];

  it("deduplicates by key (first wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["clarity", "scope"]);
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 items without prior", () => {
    const many: DynamicCriterion[] = ["a", "b", "c", "d"].map((k) => dynDim(k, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior criteria order when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "scope" },
      { key: "clarity", label: "Clarity", bestPractice: "clarity" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["scope", "clarity"]);
    expect(result[0].label).toBe("Scope");
  });

  it("returns empty array for undefined input", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
