import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion } from "./types";

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
  it("clamps values to 0–100 and rounds", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(72.6)).toBe(73);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("oops" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the mean of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 0, 100])).toBe(67);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores", () => {
    const result = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 60), dynDim("b", 90)],
    });
    expect(result).toEqual([80, 70, 60, 90]);
  });

  it("clamps each score", () => {
    const result = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-10),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("is true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 75, 70], 80)).toBe(true);
    expect(isReady(85, [90, 80, DIMENSION_FLOOR], 80)).toBe(true);
  });

  it("is false when overall is below threshold", () => {
    expect(isReady(79, [90, 80, 70], 80)).toBe(false);
  });

  it("is false when any dimension is below the floor", () => {
    expect(isReady(85, [90, 80, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });

  it("is false for an empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("define_audience", 70)],
    refinedPrompt: "Build something great.",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 70) / 3));
  });

  it("stamps the threshold onto the result", () => {
    expect(finalizeAssessment(raw, 80).threshold).toBe(80);
    expect(finalizeAssessment(raw, 90).threshold).toBe(90);
  });

  it("sets ready=true when all gates are met", () => {
    const highRaw = {
      ...raw,
      clarity: dim(88),
      conciseness: dim(84),
      dynamicCriteria: [dynDim("define_audience", 82)],
    };
    expect(finalizeAssessment(highRaw, 80).ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    expect(finalizeAssessment(raw, 80).ready).toBe(false);
  });

  it("clamps out-of-range scores before computing", () => {
    const extremeRaw = {
      ...raw,
      clarity: dim(200),
      conciseness: dim(-50),
    };
    const result = finalizeAssessment(extremeRaw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("clarity", 70),
    dynDim("scope", 80),
    dynDim("clarity", 90), // duplicate key
  ];

  it("deduplicates by key, keeping the first occurrence", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.filter((r) => r.key === "clarity")).toHaveLength(1);
    expect(result.find((r) => r.key === "clarity")!.score).toBe(70);
  });

  it("caps to 3 items on the first assessment", () => {
    const many = [
      dynDim("a", 50),
      dynDim("b", 60),
      dynDim("c", 70),
      dynDim("d", 80),
    ];
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("locks to prior specs when given, in the same order", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "a" },
      { key: "b", label: "B", bestPractice: "b" },
    ];
    const fresh = [dynDim("b", 88), dynDim("a", 77)];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(77);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(88);
  });

  it("falls back gracefully when a prior key is missing from fresh items", () => {
    const prior = [{ key: "missing", label: "Missing", bestPractice: "missing" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].key).toBe("missing");
    expect(result[0].score).toBe(0);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
