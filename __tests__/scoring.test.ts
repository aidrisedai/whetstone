import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, DynamicCriterion } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps to 0–100", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(101)).toBe(100);
    expect(clamp(50)).toBe(50);
  });
  it("rounds to integer", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });
  it("returns 0 for NaN / non-number", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean", () => {
    expect(computeOverall([60, 80])).toBe(70);
  });
  it("returns 0 for empty", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("rounds", () => {
    expect(computeOverall([60, 61])).toBe(61);
  });
});

describe("isReady", () => {
  it("true when overall >= threshold and all >= floor", () => {
    expect(isReady(80, [80, 80, 70], 80)).toBe(true);
  });
  it("false when overall < threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });
  it("false when any dimension < floor (65)", () => {
    expect(isReady(85, [90, 90, 64], 80)).toBe(false);
  });
  it("false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("extracts all dimension scores", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("a", 90), dynDim("b", 60)],
    });
    expect(scores).toEqual([70, 80, 90, 60]);
  });
  it("clamps out-of-range values", () => {
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: dim(70),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("a", 90)],
    refinedPrompt: "build it",
  };

  it("computes overall as mean of all dimension scores", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.overall).toBe(Math.round((70 + 80 + 90) / 3));
  });

  it("stamps threshold", () => {
    const a = finalizeAssessment(base, 75);
    expect(a.threshold).toBe(75);
  });

  it("sets ready=true when bar is cleared", () => {
    const high = {
      ...base,
      clarity: dim(85),
      conciseness: dim(85),
      dynamicCriteria: [dynDim("a", 85)],
    };
    const a = finalizeAssessment(high, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when a dimension is below DIMENSION_FLOOR", () => {
    const low = {
      ...base,
      clarity: dim(64),
      conciseness: dim(90),
      dynamicCriteria: [dynDim("a", 90)],
    };
    const a = finalizeAssessment(low, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps model scores that exceed 100", () => {
    const a = finalizeAssessment({ ...base, clarity: dim(150) }, 80);
    expect(a.clarity.score).toBe(100);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const a = finalizeAssessment(base);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const raw: DynamicCriterion[] = [
    dynDim("a", 70),
    dynDim("b", 80),
    dynDim("a", 90), // duplicate of "a"
  ];

  it("dedupes by key (first wins)", () => {
    const result = normalizeDynamicCriteria(raw, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const many = ["a", "b", "c", "d"].map((k) => dynDim(k, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs when provided", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "b" },
      { key: "a", label: "A", bestPractice: "a" },
    ];
    const result = normalizeDynamicCriteria(raw, prior);
    expect(result.map((d) => d.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(80);
    expect(result[1].score).toBe(70);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as unknown as DynamicCriterion[], null)).toEqual([]);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("is a number between 1 and 100", () => {
    expect(typeof DEFAULT_THRESHOLD).toBe("number");
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(100);
  });
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
