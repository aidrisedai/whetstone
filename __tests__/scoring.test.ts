import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes valid values through", () => expect(clamp(80)).toBe(80));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the mean of scores", () => expect(computeOverall([60, 80, 100])).toBe(80));
  it("rounds fractional means", () => expect(computeOverall([70, 71])).toBe(71));
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80], 80)).toBe(false);
  });
  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 64], 80)).toBe(false);
  });
  it("returns true when all conditions met", () => {
    expect(isReady(80, [80, 80], 80)).toBe(true);
  });
  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
  it("uses the DIMENSION_FLOOR constant (65)", () => {
    expect(DIMENSION_FLOOR).toBe(65);
    expect(isReady(80, [65, 80], 80)).toBe(true);
    expect(isReady(80, [64, 80], 80)).toBe(false);
  });
});

const baseDimension = { score: 75, rationale: "ok", suggestion: "improve" };

describe("finalizeAssessment", () => {
  const rawBase = {
    projectType: "Game",
    clarity: { ...baseDimension },
    conciseness: { ...baseDimension },
    dynamicCriteria: [],
    refinedPrompt: "Build a quiz game",
  };

  it("clamps and rounds all scores", () => {
    const result = finalizeAssessment({
      ...rawBase,
      clarity: { ...baseDimension, score: 105 },
      conciseness: { ...baseDimension, score: -5 },
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("computes overall as mean of dimension scores", () => {
    const result = finalizeAssessment({
      ...rawBase,
      clarity: { ...baseDimension, score: 70 },
      conciseness: { ...baseDimension, score: 90 },
    });
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when threshold and floor are met", () => {
    const result = finalizeAssessment({
      ...rawBase,
      clarity: { ...baseDimension, score: 80 },
      conciseness: { ...baseDimension, score: 80 },
    }, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when a dimension is below floor", () => {
    const result = finalizeAssessment({
      ...rawBase,
      clarity: { ...baseDimension, score: 90 },
      conciseness: { ...baseDimension, score: 60 },
    }, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold onto the result", () => {
    const result = finalizeAssessment(rawBase, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    const result = finalizeAssessment(rawBase);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeCriterion = (key: string, score = 70): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: `best practice for ${key}`,
    score,
    rationale: "ok",
    suggestion: "improve",
  });

  it("deduplicates by key", () => {
    const items = [makeCriterion("a"), makeCriterion("a", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
  });

  it("caps to 3 items on first assessment", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeCriterion(k));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("locks to prior criteria order when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp-b" },
      { key: "a", label: "A", bestPractice: "bp-a" },
    ];
    const items = [makeCriterion("a", 90), makeCriterion("b", 70)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[1].key).toBe("a");
  });

  it("uses prior label/bestPractice (not from model)", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "Stable Label", bestPractice: "stable bp" },
    ];
    const items = [{ ...makeCriterion("x"), label: "Different Label", bestPractice: "different bp" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Stable Label");
    expect(result[0].bestPractice).toBe("stable bp");
  });
});
