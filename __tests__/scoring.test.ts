import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { CriterionSpec, DynamicCriterion } from "@/lib/types";

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
  it("clamps to [0, 100]", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(50)).toBe(50);
  });
  it("rounds fractional scores", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });
  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("collects all scores in order", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dyn("a", 60)],
    });
    expect(scores).toEqual([80, 70, 60]);
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

describe("isReady", () => {
  const T = 80;

  it("is ready when overall >= threshold AND all dims >= floor", () => {
    expect(isReady(80, [80, 70, 70], T)).toBe(true);
    expect(isReady(95, [90, 85, 80], T)).toBe(true);
  });
  it("is NOT ready when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 70], T)).toBe(false);
  });
  it("is NOT ready when any dim is below floor", () => {
    expect(isReady(82, [80, DIMENSION_FLOOR - 1, 80], T)).toBe(false);
  });
  it("is NOT ready with empty scores", () => {
    expect(isReady(80, [], T)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  it("clamps scores and computes correct overall", () => {
    const result = finalizeAssessment(
      {
        projectType: "Game",
        clarity: dim(82),
        conciseness: dim(78),
        dynamicCriteria: [dyn("mechanic", 75)],
        refinedPrompt: "Build a game.",
      },
      80,
    );
    expect(result.clarity.score).toBe(82);
    expect(result.conciseness.score).toBe(78);
    expect(result.overall).toBe(Math.round((82 + 78 + 75) / 3));
    expect(result.threshold).toBe(80);
  });

  it("sets ready=true only when all conditions are met", () => {
    const base = {
      projectType: "App",
      clarity: dim(85),
      conciseness: dim(80),
      dynamicCriteria: [dyn("k", 75)],
      refinedPrompt: "p",
    };
    expect(finalizeAssessment(base, 80).ready).toBe(true);
    expect(finalizeAssessment({ ...base, clarity: dim(50) }, 80).ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  const spec: CriterionSpec = { key: "mechanic", label: "Mechanic", bestPractice: "mechanic" };

  it("deduplicates by key", () => {
    const items = [dyn("a", 80), dyn("a", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
  });

  it("caps to 3 items on first assessment", () => {
    const items = ["a", "b", "c", "d"].map((k) => dyn(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs when provided", () => {
    const items = [dyn("mechanic", 88)];
    const result = normalizeDynamicCriteria(items, [spec]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("mechanic");
    expect(result[0].score).toBe(88);
    expect(result[0].label).toBe("Mechanic");
  });

  it("handles missing/undefined items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
