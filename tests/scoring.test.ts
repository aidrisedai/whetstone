import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, DynamicCriterion, CriterionSpec } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynCrit = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps values to 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([100, 100])).toBe(100);
    expect(computeOverall([0])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("dimensionScores", () => {
  it("returns scores for fixed + dynamic dimensions", () => {
    const scores = dimensionScores({
      clarity: dim(85),
      conciseness: dim(75),
      dynamicCriteria: [dynCrit("specificity", 90)],
    });
    expect(scores).toEqual([85, 75, 90]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(80, [80, 75, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 75, 70], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor (65)", () => {
    expect(isReady(80, [80, 80, 64], 80)).toBe(false);
    expect(isReady(80, [80, 80, 65], 80)).toBe(true);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("DEFAULT_THRESHOLD and DIMENSION_FLOOR", () => {
  it("has expected defaults", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
    expect(DIMENSION_FLOOR).toBe(65);
  });
});

describe("finalizeAssessment", () => {
  const rawBase: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "web-app",
    clarity: dim(85),
    conciseness: dim(78),
    dynamicCriteria: [dynCrit("specificity", 82)],
    refinedPrompt: "Build me a todo app",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.overall).toBe(Math.round((85 + 78 + 82) / 3));
  });

  it("sets ready=true when threshold is met and all dimensions clear floor", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...rawBase,
      clarity: dim(50),
      conciseness: dim(50),
      dynamicCriteria: [dynCrit("specificity", 50)],
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...rawBase,
      clarity: dim(150),
      conciseness: dim(-20),
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(rawBase);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("returns up to 3 criteria on first call (no prior)", () => {
    const items = [
      dynCrit("a", 80),
      dynCrit("b", 70),
      dynCrit("c", 90),
      dynCrit("d", 60),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates criteria by key", () => {
    const items = [dynCrit("a", 80), dynCrit("a", 90), dynCrit("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.filter((c) => c.key === "a")).toHaveLength(1);
    expect(result[0].score).toBe(80);
  });

  it("locks to prior set on subsequent calls", () => {
    const prior: CriterionSpec[] = [
      { key: "specificity", label: "Specificity", bestPractice: "bp1" },
      { key: "scope", label: "Scope", bestPractice: "bp2" },
    ];
    const items = [dynCrit("specificity", 85), dynCrit("scope", 75), dynCrit("extra", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("specificity");
    expect(result[1].key).toBe("scope");
    expect(result.find((c) => c.key === "extra")).toBeUndefined();
  });

  it("handles empty or undefined input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
