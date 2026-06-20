import { describe, it, expect, beforeEach } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

describe("clamp", () => {
  it("clamps values to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
    expect(clamp(-1)).toBe(0);
    expect(clamp(101)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
  });

  it("handles non-numeric input gracefully", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the mean of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
    expect(computeOverall([90, 85, 95])).toBe(90);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("dimensionScores", () => {
  it("returns clamped scores for fixed + dynamic dims", () => {
    const scores = dimensionScores({
      clarity: { score: 70, rationale: "", suggestion: "" },
      conciseness: { score: 80, rationale: "", suggestion: "" },
      dynamicCriteria: [{ key: "k", label: "l", bestPractice: "", score: 90, rationale: "", suggestion: "" }],
    });
    expect(scores).toEqual([70, 80, 90]);
  });

  it("clamps out-of-range dynamic scores", () => {
    const scores = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, 65], 80)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    expect(isReady(79, [80, 70, 65], 80)).toBe(false);
  });

  it("returns false when any score is below the floor", () => {
    expect(isReady(85, [85, 64, 80], 80)).toBe(false);
  });

  it("returns false for an empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects the floor boundary exactly", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, 80], 80)).toBe(true);
    expect(isReady(80, [80, DIMENSION_FLOOR - 1, 80], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "game",
    clarity: { score: 80, rationale: "r", suggestion: "s" },
    conciseness: { score: 70, rationale: "r", suggestion: "s" },
    dynamicCriteria: [
      { key: "originality", label: "Originality", bestPractice: "be original", score: 90, rationale: "r", suggestion: "s" },
    ] as DynamicCriterion[],
    refinedPrompt: "Build me a game",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((80 + 70 + 90) / 3));
  });

  it("sets ready=true when above threshold and floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when threshold not met", () => {
    const low = {
      projectType: "game",
      clarity: { score: 60, rationale: "", suggestion: "" },
      conciseness: { score: 50, rationale: "", suggestion: "" },
      dynamicCriteria: [{ key: "k", label: "l", bestPractice: "", score: 55, rationale: "", suggestion: "" }],
      refinedPrompt: "Build me a game",
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores", () => {
    const wild = {
      projectType: "game",
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
      dynamicCriteria: [],
      refinedPrompt: "Build me a game",
    };
    const result = finalizeAssessment(wild, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "originality", label: "Originality", bestPractice: "be original", score: 80, rationale: "r", suggestion: "s" },
    { key: "feasibility", label: "Feasibility", bestPractice: "be feasible", score: 70, rationale: "r", suggestion: "s" },
    { key: "market", label: "Market", bestPractice: "know market", score: 60, rationale: "r", suggestion: "s" },
    { key: "originality", label: "Dup", bestPractice: "dup", score: 90, rationale: "r2", suggestion: "s2" },
  ];

  it("deduplicates by key keeping first occurrence", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.filter((r) => r.key === "originality")).toHaveLength(1);
    expect(result.find((r) => r.key === "originality")?.score).toBe(80);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order on subsequent assessments", () => {
    const prior: CriterionSpec[] = [
      { key: "feasibility", label: "Feasibility", bestPractice: "be feasible" },
      { key: "originality", label: "Originality", bestPractice: "be original" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("feasibility");
    expect(result[1].key).toBe("originality");
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("clamps scores when locking to prior", () => {
    const prior: CriterionSpec[] = [{ key: "originality", label: "Originality", bestPractice: "" }];
    const wild: DynamicCriterion[] = [
      { key: "originality", label: "Originality", bestPractice: "", score: 150, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(wild, prior);
    expect(result[0].score).toBe(100);
  });
});
