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
  it("rounds and bounds to 0-100", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
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
  it("averages and rounds", () => {
    expect(computeOverall([80, 81])).toBe(81);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("returns 0 for an empty list", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("requires overall >= threshold AND every dimension >= the floor", () => {
    expect(isReady(90, [90, DIMENSION_FLOOR], 80)).toBe(true);
    expect(isReady(90, [90, DIMENSION_FLOOR - 1], 80)).toBe(false);
    expect(isReady(79, [90, 90], 80)).toBe(false);
  });

  it("is never ready with no scores", () => {
    expect(isReady(100, [], 0)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "app",
    clarity: { score: 90, rationale: "clear", suggestion: "" },
    conciseness: { score: 85, rationale: "tight", suggestion: "" },
    dynamicCriteria: [
      { key: "d1", label: "D1", bestPractice: "bp", score: 95, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "prompt",
  };

  it("clamps scores and computes overall + ready deterministically", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(90); // (90+85+95)/3 = 90
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("marks not ready when a dimension is below the floor even with a high overall", () => {
    const result = finalizeAssessment(
      { ...base, conciseness: { score: 10, rationale: "", suggestion: "" } },
      50,
    );
    expect(result.ready).toBe(false);
  });

  it("never trusts an out-of-range raw score", () => {
    const result = finalizeAssessment(
      { ...base, clarity: { score: 999, rationale: "", suggestion: "" } },
      80,
    );
    expect(result.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key and caps to 3 on the first assessment", () => {
    const items: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "", score: 1, rationale: "", suggestion: "" },
      { key: "a", label: "A dup", bestPractice: "", score: 2, rationale: "", suggestion: "" },
      { key: "b", label: "B", bestPractice: "", score: 3, rationale: "", suggestion: "" },
      { key: "c", label: "C", bestPractice: "", score: 4, rationale: "", suggestion: "" },
      { key: "d", label: "D", bestPractice: "", score: 5, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.key)).toEqual(["a", "b", "c"]);
  });

  it("locks to the prior spec set and order once fixed for the session", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp-b" },
      { key: "a", label: "A", bestPractice: "bp-a" },
    ];
    const items: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "bp-a", score: 40, rationale: "ra", suggestion: "sa" },
      { key: "b", label: "B", bestPractice: "bp-b", score: 60, rationale: "rb", suggestion: "sb" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(60);
    expect(result[1].score).toBe(40);
  });

  it("filters out malformed entries and defaults missing fields", () => {
    const items = [
      { key: "a", label: "A", bestPractice: "", score: 10, rationale: "", suggestion: "" },
      { label: "no key" },
      null,
    ] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
  });

  it("returns an empty list when items is undefined and there is no prior spec", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
