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
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("clamps values below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to the nearest integer", () => expect(clamp(74.6)).toBe(75));
  it("accepts valid mid-range values", () => expect(clamp(50)).toBe(50));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("foo" as unknown as number)).toBe(0));
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value when given one score", () => expect(computeOverall([70])).toBe(70));
  it("averages correctly", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds to the nearest integer", () => expect(computeOverall([60, 61])).toBe(61));
});

// ── isReady ──────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [79, 79, 79], 80)).toBe(false));

  it("returns true when overall meets threshold and all dimensions clear the floor", () =>
    expect(isReady(80, [80, 80, 80], 80)).toBe(true));

  it("returns false when any dimension is below the floor (65)", () =>
    expect(isReady(85, [85, 85, 64], 80)).toBe(false));

  it("returns false for an empty scores array", () =>
    expect(isReady(90, [], 80)).toBe(false));

  it("uses the supplied threshold, not a hardcoded constant", () =>
    expect(isReady(70, [70, 70], 70)).toBe(true));
});

// ── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic dimensions", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "a", score: 60, rationale: "", suggestion: "" },
      ],
    });
    expect(scores).toEqual([80, 70, 60]);
  });

  it("clamps raw scores", () => {
    const scores = dimensionScores({
      clarity: { score: 110, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: { score: 80, rationale: "good", suggestion: "keep it up" },
    conciseness: { score: 75, rationale: "ok", suggestion: "tighten" },
    dynamicCriteria: [
      { key: "audience", label: "Audience", bestPractice: "define_audience", score: 85, rationale: "", suggestion: "" },
    ] as DynamicCriterion[],
    refinedPrompt: "Build something.",
  };

  it("computes overall as the mean of all dimensions", () => {
    const { overall } = finalizeAssessment(base, 80);
    // (80 + 75 + 85) / 3 = 80
    expect(overall).toBe(80);
  });

  it("marks ready=true when overall >= threshold and all dimensions >= floor", () => {
    const { ready } = finalizeAssessment(base, 80);
    expect(ready).toBe(true);
  });

  it("marks ready=false when a dimension is below the floor", () => {
    const low = {
      ...base,
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "a", score: 40, rationale: "", suggestion: "" },
      ] as DynamicCriterion[],
    };
    const { ready } = finalizeAssessment(low, 80);
    expect(ready).toBe(false);
  });

  it("stamps the threshold onto the result", () => {
    expect(finalizeAssessment(base, 90).threshold).toBe(90);
  });

  it("clamps raw scores before computing overall", () => {
    const over = { ...base, clarity: { score: 200, rationale: "", suggestion: "" } };
    expect(finalizeAssessment(over, 80).clarity.score).toBe(100);
  });

  it("uses DEFAULT_THRESHOLD when none is supplied", () => {
    expect(finalizeAssessment(base).threshold).toBe(DEFAULT_THRESHOLD);
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeCriterion = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates by key (keeps the first occurrence)", () => {
    const items = [makeCriterion("a", 70), makeCriterion("a", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items on the first assessment (no prior)", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeCriterion(k, 60));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior specs and updates scores", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "Alpha", bestPractice: "be_clear_and_direct" },
      { key: "b", label: "Beta", bestPractice: "define_audience" },
    ];
    const items = [makeCriterion("a", 90), makeCriterion("b", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].label).toBe("Alpha");
    expect(result[0].score).toBe(90);
    expect(result[1].key).toBe("b");
  });

  it("returns 0 score for a prior key absent from the model response", () => {
    const prior: CriterionSpec[] = [{ key: "missing", label: "Missing", bestPractice: "x" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].score).toBe(0);
  });

  it("handles undefined/null items gracefully", () => {
    expect(() => normalizeDynamicCriteria(undefined, null)).not.toThrow();
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

// ── DIMENSION_FLOOR constant ─────────────────────────────────────────────────

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
