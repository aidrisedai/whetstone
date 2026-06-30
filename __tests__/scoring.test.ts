import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

describe("clamp", () => {
  it("clamps values to 0-100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(50)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });
  it("returns 0 for non-numeric input", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp(undefined as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0, 0, 0])).toBe(0);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("rounds to nearest integer", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 rounds to 71
  });
});

describe("isReady", () => {
  it("requires overall >= threshold AND every dimension >= floor", () => {
    expect(isReady(85, [80, 80, 80], 80)).toBe(true);
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
    expect(isReady(85, [80, 60, 80], 80)).toBe(false); // 60 < 65 floor
  });
  it("uses the DEFAULT_THRESHOLD and DIMENSION_FLOOR constants correctly", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
    expect(DIMENSION_FLOOR).toBe(65);
  });
  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "L1", bestPractice: "", score: 90, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([80, 70, 90]);
  });
  it("clamps out-of-range scores", () => {
    const scores = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: { score: 85, rationale: "clear", suggestion: "none" },
    conciseness: { score: 75, rationale: "tight", suggestion: "none" },
    dynamicCriteria: [] as DynamicCriterion[],
    refinedPrompt: "build a thing",
  };

  it("computes overall from mean of dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(80); // (85+75)/2 = 80
    expect(result.ready).toBe(true); // 80 >= 80 threshold AND each >= 65
  });

  it("marks not ready when below threshold", () => {
    const low = { ...base, clarity: { score: 70, rationale: "", suggestion: "" } };
    const result = finalizeAssessment(low, 80);
    expect(result.overall).toBe(73); // (70+75)/2 = 72.5 → 73
    expect(result.ready).toBe(false);
  });

  it("marks not ready when a dimension is below floor even with high overall", () => {
    const floorFail = {
      ...base,
      clarity: { score: 95, rationale: "", suggestion: "" },
      conciseness: { score: 60, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(floorFail, 80);
    expect(result.overall).toBe(78); // (95+60)/2 = 77.5 → 78
    expect(result.ready).toBe(false); // conciseness 60 < DIMENSION_FLOOR 65
  });

  it("attaches the threshold to the result", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.threshold).toBe(90);
  });
});

describe("normalizeDynamicCriteria", () => {
  const dim = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "",
    suggestion: "",
  });

  it("deduplicates by key (keeps first occurrence)", () => {
    const items = [dim("a", 80), dim("a", 90), dim("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80);
  });

  it("caps to 3 on the first assessment (no prior)", () => {
    const items = [dim("a", 80), dim("b", 70), dim("c", 60), dim("d", 50)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior spec order and updates scores", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "X", bestPractice: "p" },
      { key: "y", label: "Y", bestPractice: "q" },
    ];
    const items = [dim("y", 75), dim("x", 85)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(75);
  });

  it("handles undefined/empty input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
