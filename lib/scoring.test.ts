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
} from "./scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "./types";

const dim = (score: number) => ({
  score,
  rationale: "test",
  suggestion: "test",
});

const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "test",
  suggestion: "test",
});

describe("clamp", () => {
  it("clamps to 0-100", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(50)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("returns 0 for NaN or non-number", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages correctly", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([100, 100])).toBe(100);
    expect(computeOverall([0, 100])).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds to nearest integer", () => {
    // 80 + 81 = 161 / 2 = 80.5 → rounds to 81
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("a", 90)],
    });
    expect(scores).toEqual([70, 80, 90]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold AND all scores >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [70, 75, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [70, 75, 80], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(90, [64, 80, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("uses DIMENSION_FLOOR constant correctly", () => {
    expect(isReady(80, [DIMENSION_FLOOR, 80], 80)).toBe(true);
    expect(isReady(80, [DIMENSION_FLOOR - 1, 80], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: dim(70),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("scope", 90)],
    refinedPrompt: "Build a thing",
  };

  it("computes overall deterministically from dimensions", () => {
    const result = finalizeAssessment(base, 80);
    // scores: [70, 80, 90] → mean 80
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when threshold is crossed and all scores above floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(
      { ...base, clarity: dim(50), conciseness: dim(50), dynamicCriteria: [dynDim("a", 50)] },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the assessment", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const result = finalizeAssessment(
      { ...base, clarity: dim(110), conciseness: dim(-5), dynamicCriteria: [] },
      80,
    );
    // clarity clamped to 100, conciseness to 0 → overall = 50
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(50);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specA: CriterionSpec = { key: "a", label: "A", bestPractice: "be_clear_and_direct" };
  const specB: CriterionSpec = { key: "b", label: "B", bestPractice: "define_audience" };

  it("dedupes by key (first occurrence wins)", () => {
    const items: DynamicCriterion[] = [
      { ...specA, score: 70, rationale: "first", suggestion: "" },
      { ...specA, score: 80, rationale: "dup", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: "be_clear_and_direct",
      score: 50,
      rationale: "",
      suggestion: "",
    }));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs when prior is non-empty", () => {
    const items: DynamicCriterion[] = [
      { ...specA, score: 75, rationale: "new", suggestion: "" },
      { ...specB, score: 85, rationale: "new b", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, [specA, specB]);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(85);
  });

  it("falls back to positional match when key not found in prior", () => {
    const items: DynamicCriterion[] = [
      { key: "x", label: "X", bestPractice: "bp", score: 60, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, [specA]);
    // specA not found in items by key; falls back to positional (index 0 → items[0])
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a"); // keeps prior key/label
    expect(result[0].score).toBe(60); // uses positional score
  });

  it("returns empty array for undefined/null input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters items with non-string keys", () => {
    const items = [
      null,
      { key: 42, label: "bad", bestPractice: "bp", score: 50, rationale: "", suggestion: "" },
      dynDim("valid", 70),
    ] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("valid");
  });
});
