import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  DIMENSION_FLOOR,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "./scoring";
import type { CriterionSpec, Dimension, DynamicCriterion } from "./types";

function dim(score: number): Dimension {
  return { score, rationale: "r", suggestion: "s" };
}

function crit(key: string, score: number): DynamicCriterion {
  return { key, label: key, bestPractice: "bp", score, rationale: "r", suggestion: "s" };
}

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
    expect(clamp("80" as unknown as number)).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("clamps clarity, conciseness, and every dynamic criterion", () => {
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [crit("a", 70), crit("b", 200)],
    });
    expect(scores).toEqual([100, 0, 70, 100]);
  });

  it("returns just the fixed dimensions when there are no dynamic criteria", () => {
    expect(dimensionScores({ clarity: dim(80), conciseness: dim(60), dynamicCriteria: [] })).toEqual([80, 60]);
  });
});

describe("computeOverall", () => {
  it("returns the rounded mean", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([1, 2])).toBe(2);
  });

  it("returns 0 for an empty list", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("is true only when overall clears the threshold and every score clears the floor", () => {
    expect(isReady(85, [90, 80, 70], 80)).toBe(true);
    expect(isReady(85, [90, 80, DIMENSION_FLOOR - 1], 80)).toBe(false);
    expect(isReady(79, [90, 90, 90], 80)).toBe(false);
  });

  it("is false for an empty score list regardless of overall", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  it("clamps every score, computes overall, and stamps the threshold", () => {
    const result = finalizeAssessment(
      {
        projectType: "web",
        refinedPrompt: "build a thing",
        clarity: dim(120),
        conciseness: dim(90),
        dynamicCriteria: [crit("a", 90)],
      },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.overall).toBe(Math.round((100 + 90 + 90) / 3));
    expect(result.threshold).toBe(80);
    expect(result.ready).toBe(true);
  });

  it("is not ready when a single dimension lags below the floor", () => {
    const result = finalizeAssessment(
      {
        projectType: "web",
        refinedPrompt: "build a thing",
        clarity: dim(100),
        conciseness: dim(100),
        dynamicCriteria: [crit("a", 10)],
      },
      50,
    );
    expect(result.ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key and caps to 3 when there is no prior spec", () => {
    const items = [crit("a", 1), crit("a", 2), crit("b", 3), crit("c", 4), crit("d", 5)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((c) => c.key)).toEqual(["a", "b", "c"]);
    expect(result[0].score).toBe(1);
  });

  it("filters out malformed entries without a string key", () => {
    const items = [crit("a", 1), { score: 2 } as unknown as DynamicCriterion];
    expect(normalizeDynamicCriteria(items, null).map((c) => c.key)).toEqual(["a"]);
  });

  it("handles undefined items", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("locks to the prior spec's keys, in order, once criteria are fixed", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp-b" },
      { key: "a", label: "A", bestPractice: "bp-a" },
    ];
    const items = [crit("a", 40), crit("b", 60)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((c) => c.key)).toEqual(["b", "a"]);
    expect(result[0]).toMatchObject({ key: "b", label: "B", bestPractice: "bp-b", score: 60 });
    expect(result[1]).toMatchObject({ key: "a", label: "A", bestPractice: "bp-a", score: 40 });
  });

  it("falls back to 0 and empty strings when a prior key has no matching item", () => {
    const prior: CriterionSpec[] = [{ key: "missing", label: "M", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result).toEqual([{ key: "missing", label: "M", bestPractice: "bp", score: 0, rationale: "", suggestion: "" }]);
  });
});
