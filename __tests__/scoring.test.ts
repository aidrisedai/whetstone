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
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("rounds and clamps to 0–100", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(NaN)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, 65], 80)).toBe(true);
  });
  it("false when overall < threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });
  it("false when any score below DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 80, 64], 80)).toBe(false);
  });
  it("false with empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    refinedPrompt: "Build a web app.",
    clarity: dim(85),
    conciseness: dim(80),
    dynamicCriteria: [dyn("define_audience", 78)],
  };

  it("computes overall as the mean of all dimensions", () => {
    const a = finalizeAssessment(base);
    // mean(85, 80, 78) = 81
    expect(a.overall).toBe(81);
  });

  it("marks ready when overall >= threshold and no floor breach", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.ready).toBe(true);
  });

  it("marks not ready when one dimension is below the floor", () => {
    const a = finalizeAssessment(
      { ...base, conciseness: dim(60) }, // 60 < DIMENSION_FLOOR (65)
      80,
    );
    expect(a.ready).toBe(false);
  });

  it("clamps scores to 0–100", () => {
    const a = finalizeAssessment({ ...base, clarity: dim(150) });
    expect(a.clarity.score).toBe(100);
  });

  it("stamps the threshold onto the result", () => {
    const a = finalizeAssessment(base, 75);
    expect(a.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const prior = [
    { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
    { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
  ];

  it("caps to 3 on the first turn (no prior)", () => {
    const items = [
      dyn("a", 70),
      dyn("b", 75),
      dyn("c", 80),
      dyn("d", 85), // should be dropped
    ];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("dedupes by key on the first turn", () => {
    const items = [dyn("a", 70), dyn("a", 75), dyn("b", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.filter((r) => r.key === "a")).toHaveLength(1);
  });

  it("locks to prior keys in order on subsequent turns", () => {
    const items = [dyn("success_criteria", 82), dyn("define_audience", 77)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("define_audience");
    expect(result[1].key).toBe("success_criteria");
    expect(result[0].score).toBe(77);
    expect(result[1].score).toBe(82);
  });

  it("handles empty input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("returns DEFAULT_THRESHOLD of 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("has DIMENSION_FLOOR of 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and all dynamic criteria scores", () => {
    const scores = dimensionScores({
      clarity: dim(85),
      conciseness: dim(80),
      dynamicCriteria: [dyn("a", 70), dyn("b", 75)],
    });
    expect(scores).toEqual([85, 80, 70, 75]);
  });
});
