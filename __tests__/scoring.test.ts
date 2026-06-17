import { describe, it, expect, beforeEach } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

describe("clamp", () => {
  it("returns 0–100 for valid numbers", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps values outside 0–100", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });

  it("rounds fractional values", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });
});

describe("computeOverall", () => {
  it("returns the mean of all scores", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([100, 100])).toBe(100);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("dimensionScores", () => {
  it("returns clamped scores in order: clarity, conciseness, dynamic", () => {
    const result = dimensionScores({
      clarity: { score: 85, rationale: "", suggestion: "" },
      conciseness: { score: 75, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "feasibility", label: "Feasibility", bestPractice: "", score: 90, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([85, 75, 90]);
  });

  it("clamps out-of-range scores", () => {
    const result = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(85, [85, 80, 90], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [85, 80, 90], 80)).toBe(false);
  });

  it("returns false when any score is below floor", () => {
    expect(isReady(85, [85, 60, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("uses DIMENSION_FLOOR correctly", () => {
    expect(isReady(80, [DIMENSION_FLOOR, 80], 80)).toBe(true);
    expect(isReady(80, [DIMENSION_FLOOR - 1, 80], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "app",
    clarity: { score: 85, rationale: "clear", suggestion: "" },
    conciseness: { score: 75, rationale: "ok", suggestion: "" },
    dynamicCriteria: [
      { key: "feasibility", label: "Feasibility", bestPractice: "scoped", score: 90, rationale: "yes", suggestion: "" },
    ],
    refinedPrompt: "build X",
  };

  it("computes overall as mean of clamped scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 90) / 3));
  });

  it("sets ready=true when threshold and floor conditions are met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low = { ...base, clarity: { ...base.clarity, score: 40 } };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold used", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.threshold).toBe(90);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const criteria: DynamicCriterion[] = [
    { key: "feasibility", label: "Feasibility", bestPractice: "scoped", score: 90, rationale: "yes", suggestion: "" },
    { key: "novelty", label: "Novelty", bestPractice: "fresh", score: 70, rationale: "ok", suggestion: "" },
    { key: "feasibility", label: "Feasibility (dup)", bestPractice: "scoped", score: 80, rationale: "again", suggestion: "" },
  ];

  it("deduplicates by key, keeping the first occurrence", () => {
    const result = normalizeDynamicCriteria(criteria, null);
    expect(result.map((d) => d.key)).toEqual(["feasibility", "novelty"]);
    expect(result[0].score).toBe(90);
  });

  it("caps to 3 items on first assessment", () => {
    const many: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: "",
      score: 80,
      rationale: "",
      suggestion: "",
    }));
    expect(normalizeDynamicCriteria(many, null).length).toBe(3);
  });

  it("locks criteria to prior set when prior is non-empty", () => {
    const prior = [
      { key: "feasibility", label: "Feasibility", bestPractice: "scoped" },
      { key: "novelty", label: "Novelty", bestPractice: "fresh" },
    ];
    const result = normalizeDynamicCriteria(criteria, prior);
    expect(result[0].key).toBe("feasibility");
    expect(result[1].key).toBe("novelty");
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
