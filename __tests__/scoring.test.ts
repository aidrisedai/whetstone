import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

describe("clamp", () => {
  it("clamps values to 0–100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(50)).toBe(50);
    expect(clamp(50.7)).toBe(51);
  });

  it("returns 0 for NaN or non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and no dimension is below floor", () => {
    expect(isReady(80, [80, 70, 65], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });

  it("returns false when any dimension is below floor", () => {
    expect(isReady(85, [85, 85, 64], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "app",
    refinedPrompt: "Build a habit tracker",
    clarity: dim(90),
    conciseness: dim(70),
    dynamicCriteria: [
      { key: "novelty", label: "Novelty", bestPractice: "be new", score: 80, rationale: "r", suggestion: "s" },
    ],
  };

  it("clamps scores and computes correct overall", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((90 + 70 + 80) / 3));
    expect(result.threshold).toBe(80);
  });

  it("marks ready when all conditions met", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("clamps out-of-range input scores", () => {
    const result = finalizeAssessment(
      { ...raw, clarity: dim(150), conciseness: dim(-10) },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "a", label: "A", bestPractice: "bp", score: 70, rationale: "r", suggestion: "s" },
    { key: "b", label: "B", bestPractice: "bp", score: 80, rationale: "r", suggestion: "s" },
    { key: "a", label: "A dup", bestPractice: "bp", score: 60, rationale: "r", suggestion: "s" },
  ];

  it("deduplicates by key (first occurrence wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.filter((d) => d.key === "a").length).toBe(1);
    expect(result.find((d) => d.key === "a")?.score).toBe(70);
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const many: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: "bp",
      score: 50,
      rationale: "r",
      suggestion: "s",
    }));
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior specs when provided", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "bp" },
      { key: "b", label: "B", bestPractice: "bp" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result[0].label).toBe("A");
    expect(result[1].label).toBe("B");
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("clamps scores when a prior spec is provided", () => {
    const prior = [{ key: "x", label: "X", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria(
      [{ key: "x", label: "X", bestPractice: "bp", score: 200, rationale: "r", suggestion: "s" }],
      prior,
    );
    expect(result[0].score).toBe(100);
  });
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
