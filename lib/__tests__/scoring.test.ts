import { describe, expect, it } from "vitest";
import {
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "../scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "../types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

const rawAssessment = (
  clarityScore: number,
  concisenessScore: number,
  dynamic: DynamicCriterion[] = [],
): Omit<Assessment, "overall" | "ready" | "threshold"> => ({
  projectType: "Web app",
  clarity: dim(clarityScore),
  conciseness: dim(concisenessScore),
  dynamicCriteria: dynamic,
  refinedPrompt: "Build something.",
});

describe("clamp", () => {
  it("clamps to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(49.4)).toBe(49);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the mean of scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0, 0, 0])).toBe(0);
  });

  it("rounds to the nearest integer", () => {
    // 70 + 71 + 72 = 213 / 3 = 71
    expect(computeOverall([70, 71, 72])).toBe(71);
  });

  it("returns 0 for empty scores array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("audience", 60)],
    });
    expect(scores).toEqual([70, 80, 60]);
  });

  it("clamps raw scores from the model", () => {
    const scores = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("is true when overall >= threshold and all dimensions >= floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
    expect(isReady(90, [90, 80, 85], 80)).toBe(true);
  });

  it("is false when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });

  it("is false when any dimension is below the floor", () => {
    // DIMENSION_FLOOR is 65; one score is 64
    expect(isReady(80, [80, 64, 75], 80)).toBe(false);
  });

  it("is false for empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 75)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  it("computes overall as the mean of all dimensions", () => {
    const result = finalizeAssessment(rawAssessment(80, 60, [dynDim("k1", 70)]), 80);
    // (80 + 60 + 70) / 3 = 70
    expect(result.overall).toBe(70);
  });

  it("marks ready when all conditions are met", () => {
    const result = finalizeAssessment(rawAssessment(80, 80, [dynDim("k1", 80)]), 80);
    expect(result.ready).toBe(true);
  });

  it("marks not ready when overall is below threshold", () => {
    const result = finalizeAssessment(rawAssessment(60, 60, [dynDim("k1", 60)]), 80);
    expect(result.overall).toBe(60);
    expect(result.ready).toBe(false);
  });

  it("marks not ready when a dimension is below the floor even if overall is above threshold", () => {
    // (80 + 80 + 50) / 3 = 70 < 80 threshold anyway, but illustrate the floor gate
    const result = finalizeAssessment(rawAssessment(90, 95, [dynDim("k1", 50)]), 80);
    // overall = (90 + 95 + 50) / 3 = 78 < 80, also 50 < DIMENSION_FLOOR
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold onto the result", () => {
    const result = finalizeAssessment(rawAssessment(70, 70), 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment(rawAssessment(150, -10));
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none is provided", () => {
    const result = finalizeAssessment(rawAssessment(80, 80));
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("audience", 70),
    dynDim("scope", 60),
    dynDim("success", 80),
  ];

  it("caps to 3 items on the first assessment (no prior)", () => {
    const overlong: DynamicCriterion[] = [
      dynDim("a", 70),
      dynDim("b", 60),
      dynDim("c", 80),
      dynDim("d", 50),
    ];
    expect(normalizeDynamicCriteria(overlong, null)).toHaveLength(3);
  });

  it("deduplicates by key, keeping the first occurrence", () => {
    const duped: DynamicCriterion[] = [
      dynDim("audience", 70),
      dynDim("audience", 90), // duplicate — should be ignored
      dynDim("scope", 60),
    ];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("locks to prior criteria order when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(60);
    expect(result[1].key).toBe("audience");
    expect(result[1].score).toBe(70);
  });

  it("preserves prior labels/bestPractice even if model echoes different values", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Target Audience", bestPractice: "define_audience" },
    ];
    const changed: DynamicCriterion[] = [
      { ...dynDim("audience", 75), label: "Different label", bestPractice: "something_else" },
    ];
    const result = normalizeDynamicCriteria(changed, prior);
    expect(result[0].label).toBe("Target Audience");
    expect(result[0].bestPractice).toBe("define_audience");
    expect(result[0].score).toBe(75); // score IS updated
  });

  it("falls back gracefully when model score is missing for a prior key", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
      { key: "missing_key", label: "Not in model output", bestPractice: "be_clear_and_direct" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    // missing_key → falls back to deduped[1] (scope, score 60)
    expect(result[1].score).toBe(60);
  });

  it("handles undefined or null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([] as DynamicCriterion[], null)).toEqual([]);
  });

  it("clamps out-of-range scores on prior-locked items", () => {
    const prior: CriterionSpec[] = [{ key: "audience", label: "Audience", bestPractice: "define_audience" }];
    const oob: DynamicCriterion[] = [dynDim("audience", 120)]; // out of bounds
    const result = normalizeDynamicCriteria(oob, prior);
    expect(result[0].score).toBe(100); // clamped to 100
  });
});

describe("integration: a full scoring session", () => {
  it("scores climb as the builder sharpens their idea", () => {
    const early = finalizeAssessment(rawAssessment(30, 25, [dynDim("audience", 20)]), 80);
    const later = finalizeAssessment(rawAssessment(75, 70, [dynDim("audience", 68)]), 80);
    expect(later.overall).toBeGreaterThan(early.overall);
    expect(early.ready).toBe(false);
  });

  it("crosses the export gate when all dimensions clear", () => {
    const sharp = finalizeAssessment(rawAssessment(82, 80, [dynDim("audience", 78)]), 80);
    // overall = (82 + 80 + 78) / 3 = 80; all > 65
    expect(sharp.ready).toBe(true);
  });

  it("a single weak dimension blocks export even with high overall", () => {
    // Two strong dims carry the mean above threshold, but one lags
    const blocked = finalizeAssessment(rawAssessment(95, 95, [dynDim("weak", 60)]), 80);
    // overall = (95 + 95 + 60) / 3 = 83.3 ≈ 83 >= 80, but 60 < DIMENSION_FLOOR(65)
    expect(blocked.overall).toBeGreaterThanOrEqual(80);
    expect(blocked.ready).toBe(false);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
