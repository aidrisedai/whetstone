import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

describe("clamp", () => {
  it("keeps values within 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps values out of range", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("handles non-numeric input", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
  });

  it("rounds fractional averages", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles single value", () => {
    expect(computeOverall([75])).toBe(75);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dimensions clear floor", () => {
    expect(isReady(85, [85, 80, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 80, 70], 80)).toBe(false);
  });

  it("returns false when a dimension is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 60, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects the floor boundary exactly", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true);
    expect(isReady(80, [80, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
});

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("finalizeAssessment", () => {
  it("clamps scores and computes overall deterministically", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: dim(85),
      conciseness: dim(75),
      dynamicCriteria: [dynDim("focus", 90)],
      refinedPrompt: "Build X",
    });

    expect(result.clarity.score).toBe(85);
    expect(result.conciseness.score).toBe(75);
    expect(result.overall).toBe(Math.round((85 + 75 + 90) / 3));
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("marks ready=false when a dimension is below floor", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: dim(90),
      conciseness: dim(60),
      dynamicCriteria: [dynDim("focus", 90)],
      refinedPrompt: "Build X",
    });
    expect(result.ready).toBe(false);
  });

  it("marks ready=true when everything passes", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: dim(85),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("focus", 80)],
      refinedPrompt: "Build X",
    });
    expect(result.ready).toBe(true);
  });

  it("clamps out-of-range scores from the model", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: dim(150),
      conciseness: dim(-5),
      dynamicCriteria: [],
      refinedPrompt: "Build X",
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first call (no prior)", () => {
    const items: DynamicCriterion[] = [dynDim("a", 80), dynDim("a", 90), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first occurrence wins
  });

  it("caps to 3 criteria on first call", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynDim(k, 75));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior keys on subsequent calls", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "Alpha", bestPractice: "bp-a" },
      { key: "b", label: "Beta", bestPractice: "bp-b" },
    ];
    const items: DynamicCriterion[] = [
      { key: "a", label: "Alpha", bestPractice: "bp-a", score: 88, rationale: "r", suggestion: "s" },
      { key: "b", label: "Beta", bestPractice: "bp-b", score: 72, rationale: "r", suggestion: "s" },
      { key: "c", label: "Gamma", bestPractice: "bp-c", score: 99, rationale: "r", suggestion: "s" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(88);
    expect(result[1].key).toBe("b");
    // labels and bestPractice come from prior, not model
    expect(result[0].label).toBe("Alpha");
    expect(result[0].bestPractice).toBe("bp-a");
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
