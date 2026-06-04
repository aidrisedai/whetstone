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
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

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
  it("passes a mid-range value through unchanged", () => {
    expect(clamp(50)).toBe(50);
  });
  it("clamps below 0 to 0", () => {
    expect(clamp(-10)).toBe(0);
  });
  it("clamps above 100 to 100", () => {
    expect(clamp(110)).toBe(100);
  });
  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });
  it("rounds to nearest integer", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });
  it("handles boundary values", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

describe("computeOverall", () => {
  it("returns the mean of the scores", () => {
    expect(computeOverall([80, 60, 70])).toBe(70);
  });
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("rounds the result", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 → 71
  });
  it("handles a single score", () => {
    expect(computeOverall([85])).toBe(85);
  });
});

describe("dimensionScores", () => {
  it("returns clamped scores for clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 60), dynDim("b", 110)],
    });
    expect(scores).toEqual([80, 70, 60, 100]);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(85, [80, 70, 75], 80)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });
  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [80, 64, 75], 80)).toBe(false);
  });
  it("returns false for an empty scores array", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
  it("uses the DIMENSION_FLOOR constant (65)", () => {
    expect(DIMENSION_FLOOR).toBe(65);
    expect(isReady(85, [65, 70, 75], 80)).toBe(true);
    expect(isReady(85, [64, 70, 75], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Game",
    clarity: dim(75),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("core_mechanic", 70), dynDim("success_criteria", 85)],
    refinedPrompt: "Build a game.",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    // scores: 75, 80, 70, 85 → mean = 310/4 = 77.5 → 78
    expect(result.overall).toBe(78);
  });

  it("sets ready=true when overall >= threshold and all scores >= floor", () => {
    const highBase = {
      ...base,
      clarity: dim(85),
      conciseness: dim(85),
      dynamicCriteria: [dynDim("core_mechanic", 85), dynDim("success_criteria", 85)],
    };
    const result = finalizeAssessment(highBase, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall < threshold", () => {
    const lowBase = {
      ...base,
      clarity: dim(50),
      conciseness: dim(50),
      dynamicCriteria: [dynDim("a", 50), dynDim("b", 50)],
    };
    const result = finalizeAssessment(lowBase, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const outBase = {
      ...base,
      clarity: dim(-5),
      conciseness: dim(150),
    };
    const result = finalizeAssessment(outBase, 80);
    expect(result.clarity.score).toBe(0);
    expect(result.conciseness.score).toBe(100);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when threshold is omitted", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const spec: CriterionSpec = { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" };
  const item: DynamicCriterion = { ...spec, score: 75, rationale: "r", suggestion: "s" };

  it("deduplicates by key", () => {
    const result = normalizeDynamicCriteria([item, item], null);
    expect(result).toHaveLength(1);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const many = ["a", "b", "c", "d"].map((k) => dynDim(k, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria when provided, preserving key/label/bestPractice", () => {
    const prior: CriterionSpec[] = [spec];
    const updated = { ...item, score: 88 };
    const result = normalizeDynamicCriteria([updated], prior);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe(spec.key);
    expect(result[0].label).toBe(spec.label);
    expect(result[0].score).toBe(88);
  });

  it("handles missing items gracefully by using fallback with score 0", () => {
    const prior: CriterionSpec[] = [spec];
    const result = normalizeDynamicCriteria([], prior);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(0);
  });

  it("returns empty array for undefined input", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toHaveLength(0);
  });
});
