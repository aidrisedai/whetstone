import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion } from "../types";

describe("clamp", () => {
  it("rounds and clamps to 0–100", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(NaN)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 60, 70])).toBe(70);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(85, [70, 80, 90], 80)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [70, 80, 90], 80)).toBe(false);
  });
  it("returns false when any dimension is below the floor", () => {
    expect(isReady(85, [64, 80, 90], 80)).toBe(false);
  });
  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });
  it("passes exactly at threshold and floor boundary", () => {
    expect(isReady(80, [DIMENSION_FLOOR, 80], 80)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("includes fixed and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: { score: 75, rationale: "", suggestion: "" },
      conciseness: { score: 60, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: 80, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([75, 60, 80]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "web app",
    refinedPrompt: "Build a task manager",
    clarity: { score: 90, rationale: "good", suggestion: "" },
    conciseness: { score: 70, rationale: "ok", suggestion: "" },
    dynamicCriteria: [
      { key: "feasibility", label: "Feasibility", bestPractice: "", score: 80, rationale: "", suggestion: "" },
    ],
  };

  it("computes overall as mean of clamped scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((90 + 70 + 80) / 3));
  });

  it("sets ready=true when thresholds are met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low = {
      ...base,
      clarity: { score: 50, rationale: "", suggestion: "" },
      conciseness: { score: 50, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "feasibility", label: "Feasibility", bestPractice: "", score: 50, rationale: "", suggestion: "" },
      ],
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const withOverflow = {
      ...base,
      clarity: { score: 120, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(withOverflow, 80);
    expect(result.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "a", label: "A", bestPractice: "bp-a", score: 75, rationale: "r", suggestion: "s" },
    { key: "b", label: "B", bestPractice: "bp-b", score: 60, rationale: "r", suggestion: "s" },
    { key: "a", label: "A dup", bestPractice: "bp-a", score: 80, rationale: "dup", suggestion: "" },
  ];

  it("dedupes by key on first assessment, caps to 3", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(75);
  });

  it("locks to prior criteria set when provided", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "bp-a" },
      { key: "b", label: "B", bestPractice: "bp-b" },
    ];
    const fresh: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "bp-a", score: 90, rationale: "new", suggestion: "" },
      { key: "b", label: "B", bestPractice: "bp-b", score: 55, rationale: "new", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result[0].score).toBe(90);
    expect(result[1].score).toBe(55);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
  });

  it("handles undefined/null gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
