import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

describe("clamp", () => {
  it("clamps values to 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("handles non-numbers safely", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
    expect(computeOverall([70, 70, 70])).toBe(70);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dimensions clear floor", () => {
    expect(isReady(85, [85, 80, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [85, 80, 70], 80)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 80, 60], 80)).toBe(false);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("passes with exactly threshold and exactly floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores", () => {
    const a = {
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k", label: "L", bestPractice: "bp", score: 90, rationale: "", suggestion: "" },
      ],
    };
    expect(dimensionScores(a)).toEqual([80, 70, 90]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: { score: 85, rationale: "r", suggestion: "s" },
    conciseness: { score: 80, rationale: "r", suggestion: "s" },
    dynamicCriteria: [
      { key: "k", label: "L", bestPractice: "bp", score: 75, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "build something cool",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((85 + 80 + 75) / 3));
  });

  it("marks ready when threshold is crossed and floor is cleared", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("marks not ready when overall is below threshold", () => {
    const low = {
      ...base,
      clarity: { score: 50, rationale: "", suggestion: "" },
      conciseness: { score: 50, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const wild = {
      ...base,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -20, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(wild, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold value", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "a", label: "A", bestPractice: "bp_a", score: 80, rationale: "r", suggestion: "s" },
    { key: "b", label: "B", bestPractice: "bp_b", score: 70, rationale: "r", suggestion: "s" },
    { key: "c", label: "C", bestPractice: "bp_c", score: 60, rationale: "r", suggestion: "s" },
  ];

  it("caps to 3 on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria([...items, { key: "d", label: "D", bestPractice: "bp_d", score: 50, rationale: "", suggestion: "" }], null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const duped: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "bp", score: 80, rationale: "", suggestion: "" },
      { key: "a", label: "A", bestPractice: "bp", score: 90, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80); // first occurrence wins
  });

  it("locks to prior criteria order and keys when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "c", label: "C", bestPractice: "bp_c" },
      { key: "a", label: "A", bestPractice: "bp_a" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("c");
    expect(result[1].key).toBe("a");
  });

  it("handles undefined items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
