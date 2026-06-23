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

const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps values to 0-100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
    expect(clamp(150)).toBe(100);
  });
  it("rounds to integer", () => {
    expect(clamp(72.7)).toBe(73);
    expect(clamp(72.3)).toBe(72);
  });
  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of all scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
    expect(computeOverall([77, 83, 90])).toBe(83);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic dimensions", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("audience", 90)],
    });
    expect(scores).toEqual([80, 70, 90]);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all above floor", () => {
    expect(isReady(82, [82, 80, 75], 80)).toBe(true);
  });
  it("returns false when overall below threshold", () => {
    expect(isReady(79, [79, 80, 75], 80)).toBe(false);
  });
  it("returns false when any dimension below floor", () => {
    expect(isReady(82, [82, 80, 64], 80)).toBe(false);
  });
  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "web app",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("audience", 82), dynDim("scope", 78)],
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 82 + 78) / 4));
  });

  it("sets ready=true when above threshold and floor", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(result.overall >= 80 && Math.min(85, 75, 82, 78) >= DIMENSION_FLOOR);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores", () => {
    const outOfRange: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...raw,
      clarity: dim(120),
      conciseness: dim(-10),
    };
    const result = finalizeAssessment(outOfRange, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    const result = finalizeAssessment(raw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key, keeping first occurrence", () => {
    const items: DynamicCriterion[] = [
      dynDim("audience", 80),
      dynDim("audience", 90),
      dynDim("scope", 70),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(80);
  });

  it("caps free-form result at 3 items", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynDim(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria set in order", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "bp1" },
      { key: "scope", label: "Scope", bestPractice: "bp2" },
    ];
    const items: DynamicCriterion[] = [
      dynDim("scope", 88),
      dynDim("audience", 76),
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(76);
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(88);
    expect(result[0].label).toBe("Audience");
  });

  it("handles empty or undefined items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
