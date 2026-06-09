import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion } from "./types";

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
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(74.6)).toBe(75));
  it("passes through 0-100", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages correctly", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([80, 81])).toBe(81));
});

describe("isReady", () => {
  it("is false when overall is below threshold", () =>
    expect(isReady(79, [79, 80, 80], 80)).toBe(false));
  it("is false when a dimension is below DIMENSION_FLOOR", () =>
    expect(isReady(85, [85, 64, 90], 80)).toBe(false));
  it("is true when overall >= threshold and all dims >= floor", () =>
    expect(isReady(80, [80, 65, 90], 80)).toBe(true));
  it("is false for empty scores array", () =>
    expect(isReady(100, [], 80)).toBe(false));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const result = dimensionScores({
      clarity: dim(90),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 80)],
    });
    expect(result).toEqual([90, 70, 80]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "app",
    clarity: dim(90),
    conciseness: dim(70),
    dynamicCriteria: [dynDim("audience", 80)],
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as the mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(80); // (90+70+80)/3 = 80
  });

  it("sets ready=true when score meets threshold and all dims >= floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const result = finalizeAssessment(
      { ...base, dynamicCriteria: [dynDim("audience", 50)] },
      70,
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const result = finalizeAssessment({ ...base, clarity: dim(150) }, 80);
    expect(result.clarity.score).toBe(100);
  });

  it("stamps the active threshold", () => {
    expect(finalizeAssessment(base, 75).threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first assessment (no prior)", () => {
    const items = [dynDim("a", 80), dynDim("a", 90), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first wins
  });

  it("caps to 3 on first assessment", () => {
    const items = [dynDim("a", 80), dynDim("b", 70), dynDim("c", 60), dynDim("d", 50)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior set and only updates score/rationale/suggestion", () => {
    const prior = [{ key: "a", label: "Audience", bestPractice: "bp" }];
    const items = [dynDim("a", 95)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
    expect(result[0].label).toBe("Audience"); // locked from prior
    expect(result[0].score).toBe(95);
  });

  it("handles empty items gracefully", () => {
    expect(normalizeDynamicCriteria([], null)).toHaveLength(0);
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
  });
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
