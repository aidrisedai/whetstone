import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion } from "../types";

describe("clamp", () => {
  it("clamps values within 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds non-integers", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("hello" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the rounded mean of all scores", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
    expect(computeOverall([100])).toBe(100);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 75, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 75, 70], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor", () => {
    expect(isReady(85, [85, 85, 64], 80)).toBe(false);
    expect(isReady(85, [85, 85, DIMENSION_FLOOR], 80)).toBe(true);
  });

  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("extracts and clamps all dimension scores", () => {
    const input = {
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 110, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: -5, rationale: "", suggestion: "" },
      ],
    };
    const result = dimensionScores(input);
    expect(result).toEqual([80, 100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "app",
    clarity: { score: 85, rationale: "good", suggestion: "" },
    conciseness: { score: 78, rationale: "ok", suggestion: "" },
    dynamicCriteria: [] as DynamicCriterion[],
    refinedPrompt: "A cool app",
  };

  it("computes overall as mean of clarity and conciseness when no dynamic criteria", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(82); // mean of 85 and 78
  });

  it("sets ready=true when overall >= threshold and all scores >= floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when any dimension is below the floor", () => {
    const lowBase = {
      ...base,
      clarity: { score: 60, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(lowBase, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const spec = [
    { key: "feasibility", label: "Feasibility", bestPractice: "bp1" },
    { key: "novelty", label: "Novelty", bestPractice: "bp2" },
  ];

  const items: DynamicCriterion[] = [
    { key: "feasibility", label: "Feasibility", bestPractice: "bp1", score: 80, rationale: "r1", suggestion: "s1" },
    { key: "novelty", label: "Novelty", bestPractice: "bp2", score: 70, rationale: "r2", suggestion: "s2" },
  ];

  it("locks to prior specs when provided", () => {
    const result = normalizeDynamicCriteria(items, spec);
    expect(result.map((r) => r.key)).toEqual(["feasibility", "novelty"]);
    expect(result[0].score).toBe(80);
  });

  it("deduplicates by key on first assessment (no prior)", () => {
    const duped = [...items, { ...items[0] }];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result.length).toBe(2);
    expect(result[0].key).toBe("feasibility");
  });

  it("caps to 3 items on first assessment", () => {
    const many: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: "",
      score: 70,
      rationale: "",
      suggestion: "",
    }));
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
