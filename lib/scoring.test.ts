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
import type { CriterionSpec, DynamicCriterion } from "./types";

describe("clamp", () => {
  it("rounds and clamps into 0-100", () => {
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
        { key: "a", label: "A", bestPractice: "", score: 70.6, rationale: "", suggestion: "" },
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
    expect(computeOverall([80, 81])).toBe(81);
    expect(computeOverall([100, 0, 0])).toBe(33);
  });
});

describe("isReady", () => {
  it("is false with no scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("requires overall >= threshold", () => {
    expect(isReady(79, [90, 90], 80)).toBe(false);
    expect(isReady(80, [90, 90], 80)).toBe(true);
  });

  it("fails when any single dimension is below the floor, even with a high overall", () => {
    const scores = [100, 100, DIMENSION_FLOOR - 1];
    expect(computeOverall(scores)).toBeGreaterThanOrEqual(80);
    expect(isReady(computeOverall(scores), scores, 80)).toBe(false);
  });

  it("passes when overall clears the threshold and every dimension clears the floor", () => {
    const scores = [90, 85, DIMENSION_FLOOR];
    expect(isReady(computeOverall(scores), scores, 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "web",
    clarity: { score: 90, rationale: "clear", suggestion: "tighten scope" },
    conciseness: { score: 85, rationale: "concise", suggestion: "cut filler" },
    dynamicCriteria: [
      { key: "audience", label: "Audience", bestPractice: "define_audience", score: 88, rationale: "", suggestion: "" },
    ],
    refinedPrompt: "Build a thing.",
  };

  it("computes overall and ready deterministically, and stamps the threshold", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(computeOverall([90, 85, 88]));
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("clamps out-of-range scores from the model before computing", () => {
    const result = finalizeAssessment(
      { ...base, clarity: { ...base.clarity, score: 500 } },
      80,
    );
    expect(result.clarity.score).toBe(100);
  });

  it("defaults the threshold when none is passed", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBeGreaterThan(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "audience", label: "Audience", bestPractice: "define_audience" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
  ];

  it("dedupes by key and caps to 3 on the first assessment (no prior spec)", () => {
    const items: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "", score: 10, rationale: "", suggestion: "" },
      { key: "a", label: "A dup", bestPractice: "", score: 99, rationale: "", suggestion: "" },
      { key: "b", label: "B", bestPractice: "", score: 20, rationale: "", suggestion: "" },
      { key: "c", label: "C", bestPractice: "", score: 30, rationale: "", suggestion: "" },
      { key: "d", label: "D", bestPractice: "", score: 40, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.key)).toEqual(["a", "b", "c"]);
    expect(result[0].score).toBe(10); // first occurrence wins, not the duplicate
  });

  it("filters out malformed entries without a string key", () => {
    const items = [
      { key: "a", label: "A", bestPractice: "", score: 10, rationale: "", suggestion: "" },
      { label: "no key" },
      null,
    ] as unknown as DynamicCriterion[];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(1);
  });

  it("locks to the prior spec set, in order, pulling each one's latest values by key", () => {
    const items: DynamicCriterion[] = [
      { key: "audience", label: "Audience", bestPractice: "", score: 55, rationale: "vague", suggestion: "name a user" },
      { key: "scope", label: "Scope", bestPractice: "", score: 77, rationale: "tight", suggestion: "narrow further" },
    ];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result.map((r) => r.key)).toEqual(["audience", "scope"]);
    expect(result[0]).toMatchObject({ score: 55, rationale: "vague", suggestion: "name a user" });
    expect(result[1]).toMatchObject({ score: 77, rationale: "tight", suggestion: "narrow further" });
  });

  it("falls back to the positional entry when a key from the spec is missing this turn", () => {
    // Only one item returned this turn, keyed "scope" — "audience" isn't present by key,
    // so it falls back to the item at the same index (position 0) rather than zeroing out.
    const items: DynamicCriterion[] = [
      { key: "scope", label: "Scope", bestPractice: "", score: 77, rationale: "tight", suggestion: "narrow further" },
    ];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result.map((r) => r.key)).toEqual(["audience", "scope"]);
    expect(result[0]).toMatchObject({ score: 77, rationale: "tight", suggestion: "narrow further" });
  });
});
