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
import type { Assessment, CriterionSpec, DynamicCriterion } from "../lib/types";

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
  it("clamps values to 0-100", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(50)).toBe(50);
  });
  it("rounds to nearest integer", () => {
    expect(clamp(72.6)).toBe(73);
  });
  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    // @ts-expect-error intentional
    expect(clamp("foo")).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 60, 70])).toBe(70);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("rounds correctly", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("audience", 90)],
    });
    expect(scores).toEqual([80, 70, 90]);
  });
});

describe("isReady", () => {
  it("is ready when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });
  it("is not ready when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });
  it("is not ready when any score is below the floor (65)", () => {
    expect(isReady(80, [80, 64, 80], 80)).toBe(false);
  });
  it("is not ready with empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Game",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("mechanic", 90), dynDim("winstate", 80)],
    refinedPrompt: "build a game",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 90 + 80) / 4));
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(raw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment({ ...raw, clarity: dim(120) });
    expect(result.clarity.score).toBe(100);
  });

  it("sets ready correctly", () => {
    const readyResult = finalizeAssessment(raw, 80);
    expect(readyResult.ready).toBe(readyResult.overall >= 80 && Math.min(85, 75, 90, 80) >= DIMENSION_FLOOR);
  });
});

describe("normalizeDynamicCriteria", () => {
  const priorSpecs: CriterionSpec[] = [
    { key: "audience", label: "Audience", bestPractice: "define_audience" },
    { key: "scope", label: "Scope", bestPractice: "scope" },
  ];

  it("deduplicates by key", () => {
    const dupes = [dynDim("audience", 70), dynDim("audience", 80)];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const many = [
      dynDim("a", 70),
      dynDim("b", 80),
      dynDim("c", 90),
      dynDim("d", 60),
    ];
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs when provided", () => {
    const incoming = [dynDim("audience", 75), dynDim("scope", 85), dynDim("extra", 99)];
    const result = normalizeDynamicCriteria(incoming, priorSpecs);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[1].key).toBe("scope");
    expect(result.find((d) => d.key === "extra")).toBeUndefined();
  });

  it("preserves prior labels and bestPractice when locking", () => {
    const incoming = [dynDim("audience", 75)];
    const result = normalizeDynamicCriteria(incoming, priorSpecs);
    expect(result[0].label).toBe("Audience");
    expect(result[0].bestPractice).toBe("define_audience");
  });

  it("handles undefined/empty input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
