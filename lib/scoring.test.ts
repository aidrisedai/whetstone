import { describe, expect, it } from "vitest";
import {
  DIMENSION_FLOOR,
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "./scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "./types";

describe("clamp", () => {
  it("rounds and keeps in-range numbers", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });

  it("clamps below 0 and above 100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
  });

  it("treats non-numbers and NaN as 0", () => {
    expect(clamp(Number.NaN)).toBe(0);
    // @ts-expect-error exercising runtime guard against bad model output
    expect(clamp("80")).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("clamps clarity, conciseness, and every dynamic criterion", () => {
    const scores = dimensionScores({
      clarity: { score: 120, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: 70.5, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([100, 0, 71]);
  });
});

describe("computeOverall", () => {
  it("returns 0 for an empty list", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the rounded mean", () => {
    expect(computeOverall([80, 90, 100])).toBe(90);
    expect(computeOverall([80, 81])).toBe(81); // rounds 80.5 up
  });
});

describe("isReady", () => {
  it("is false with no scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("requires overall to clear the threshold", () => {
    expect(isReady(79, [90, 90], 80)).toBe(false);
    expect(isReady(80, [90, 90], 80)).toBe(true);
  });

  it("requires every dimension to clear the floor even if overall passes", () => {
    const scores = [100, DIMENSION_FLOOR - 1];
    expect(computeOverall(scores)).toBeGreaterThanOrEqual(80);
    expect(isReady(computeOverall(scores), scores, 80)).toBe(false);
  });

  it("passes when overall and every dimension clear their bars", () => {
    const scores = [95, DIMENSION_FLOOR];
    expect(computeOverall(scores)).toBe(80);
    expect(isReady(computeOverall(scores), scores, 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "app",
    clarity: { score: 90, rationale: "clear", suggestion: "" },
    conciseness: { score: 85, rationale: "tight", suggestion: "" },
    dynamicCriteria: [
      { key: "x", label: "X", bestPractice: "bp", score: 200, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "Build a thing",
  };

  it("clamps every score and computes overall + ready deterministically", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.dynamicCriteria[0].score).toBe(100);
    expect(result.overall).toBe(computeOverall([90, 85, 100]));
    expect(result.threshold).toBe(80);
    expect(result.ready).toBe(true);
  });

  it("never trusts a threshold override to make an unready idea ready", () => {
    const result = finalizeAssessment(raw, 99);
    expect(result.ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key, keeping the first occurrence", () => {
    const items: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "", score: 10, rationale: "first", suggestion: "" },
      { key: "a", label: "A", bestPractice: "", score: 90, rationale: "dup", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].rationale).toBe("first");
  });

  it("caps to 3 on the first assessment when there's no prior spec", () => {
    const items: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `K${i}`,
      bestPractice: "",
      score: 50,
      rationale: "",
      suggestion: "",
    }));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("filters out malformed entries without a string key", () => {
    const items = [{ score: 50 }, null, undefined] as unknown as DynamicCriterion[];
    expect(normalizeDynamicCriteria(items, null)).toEqual([]);
  });

  it("locks to the prior spec set, in order, once criteria are fixed", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp-b" },
      { key: "a", label: "A", bestPractice: "bp-a" },
    ];
    const items: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "bp-a", score: 60, rationale: "ra", suggestion: "sa" },
      { key: "b", label: "B", bestPractice: "bp-b", score: 70, rationale: "rb", suggestion: "sb" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(70);
    expect(result[1].score).toBe(60);
  });

  it("defaults a missing match against the prior spec to score 0", () => {
    const prior: CriterionSpec[] = [{ key: "missing", label: "M", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result).toEqual([
      { key: "missing", label: "M", bestPractice: "bp", score: 0, rationale: "", suggestion: "" },
    ]);
  });
});
