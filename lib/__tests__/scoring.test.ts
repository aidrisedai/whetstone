import { describe, expect, it } from "vitest";
import {
  DIMENSION_FLOOR,
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "../scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "../types";

describe("clamp", () => {
  it("rounds and bounds to 0-100", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
  });

  it("treats non-numbers and NaN as 0", () => {
    expect(clamp(Number.NaN)).toBe(0);
    // @ts-expect-error exercising runtime guard against bad input
    expect(clamp("80")).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("clamps and flattens clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: { score: 90, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: 105, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([90, 0, 100]);
  });
});

describe("computeOverall", () => {
  it("returns 0 for an empty list", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("averages and rounds", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 rounds up
    expect(computeOverall([100, 0, 0])).toBe(33);
  });
});

describe("isReady", () => {
  it("is false when there are no scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("requires the overall to clear the threshold", () => {
    expect(isReady(79, [90, 90], 80)).toBe(false);
    expect(isReady(80, [90, 90], 80)).toBe(true);
  });

  it("requires every dimension to clear the floor even if overall is high", () => {
    const scores = [100, 100, DIMENSION_FLOOR - 1];
    expect(computeOverall(scores)).toBeGreaterThanOrEqual(80);
    expect(isReady(computeOverall(scores), scores, 80)).toBe(false);
  });

  it("passes when overall clears the threshold and the floor holds", () => {
    const scores = [90, 85, DIMENSION_FLOOR];
    expect(isReady(computeOverall(scores), scores, 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "web app",
    clarity: { score: 92, rationale: "clear", suggestion: "" },
    conciseness: { score: 40, rationale: "wordy", suggestion: "tighten it" },
    dynamicCriteria: [] as DynamicCriterion[],
    refinedPrompt: "",
  };

  it("computes overall and ready deterministically, never trusting model input", () => {
    const result: Assessment = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(computeOverall([92, 40]));
    expect(result.ready).toBe(false); // conciseness (40) is below the floor
    expect(result.threshold).toBe(80);
  });

  it("clamps out-of-range raw scores before computing anything", () => {
    const result = finalizeAssessment(
      { ...raw, clarity: { score: 999, rationale: "", suggestion: "" } },
      80,
    );
    expect(result.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key and caps at 3 when there is no prior spec", () => {
    const items: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "", score: 10, rationale: "", suggestion: "" },
      { key: "a", label: "A dup", bestPractice: "", score: 20, rationale: "", suggestion: "" },
      { key: "b", label: "B", bestPractice: "", score: 30, rationale: "", suggestion: "" },
      { key: "c", label: "C", bestPractice: "", score: 40, rationale: "", suggestion: "" },
      { key: "d", label: "D", bestPractice: "", score: 50, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.key)).toEqual(["a", "b", "c"]);
    expect(result[0].score).toBe(10); // first occurrence wins the dedupe
  });

  it("filters out malformed entries without a string key", () => {
    // @ts-expect-error exercising runtime guard against malformed items
    const result = normalizeDynamicCriteria([null, { score: 5 }], null);
    expect(result).toEqual([]);
  });

  it("locks to the prior spec set, in order, once criteria are fixed", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "practice-b" },
      { key: "a", label: "A", bestPractice: "practice-a" },
    ];
    const items: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "", score: 70, rationale: "r-a", suggestion: "s-a" },
      { key: "b", label: "B", bestPractice: "", score: 60, rationale: "r-b", suggestion: "s-b" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(60);
    expect(result[0].bestPractice).toBe("practice-b"); // spec wins over model echo
  });

  it("defaults a missing match to score 0 with empty rationale/suggestion", () => {
    const prior: CriterionSpec[] = [{ key: "missing", label: "M", bestPractice: "practice" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result).toEqual([
      { key: "missing", label: "M", bestPractice: "practice", score: 0, rationale: "", suggestion: "" },
    ]);
  });
});
