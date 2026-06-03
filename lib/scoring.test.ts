import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion } from "./types";

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------
describe("clamp", () => {
  it("clamps values below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to integer", () => expect(clamp(74.6)).toBe(75));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes values in range through", () => expect(clamp(55)).toBe(55));
});

// ---------------------------------------------------------------------------
// computeOverall
// ---------------------------------------------------------------------------
describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("computes mean of scores", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("rounds up on .5", () => expect(computeOverall([80, 81])).toBe(81));
});

// ---------------------------------------------------------------------------
// isReady
// ---------------------------------------------------------------------------
describe("isReady", () => {
  const threshold = 80;

  it("is ready when overall >= threshold and all dimensions >= floor", () =>
    expect(isReady(85, [85, 70, 80], threshold)).toBe(true));

  it("is not ready when overall < threshold", () =>
    expect(isReady(75, [75, 75, 75], threshold)).toBe(false));

  it("is not ready when one dimension is below the floor", () =>
    expect(isReady(82, [82, 60, 90], threshold)).toBe(false));

  it("is not ready for empty scores", () =>
    expect(isReady(90, [], threshold)).toBe(false));

  it("floor boundary: exactly DIMENSION_FLOOR passes", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR, 80], threshold)).toBe(true));

  it("floor boundary: one below DIMENSION_FLOOR fails", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR - 1, 80], threshold)).toBe(false));
});

// ---------------------------------------------------------------------------
// finalizeAssessment
// ---------------------------------------------------------------------------
describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: { score: 82, rationale: "clear", suggestion: "be clearer" },
    conciseness: { score: 78, rationale: "concise", suggestion: "trim it" },
    dynamicCriteria: [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience", score: 85, rationale: "good", suggestion: "better" },
    ],
    refinedPrompt: "Build something.",
  };

  it("stamps overall and threshold", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.threshold).toBe(80);
    expect(a.overall).toBe(Math.round((82 + 78 + 85) / 3));
  });

  it("marks ready when score clears threshold and all dims above floor", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.ready).toBe(true);
  });

  it("marks not ready when overall below threshold", () => {
    const low = {
      ...base,
      clarity: { ...base.clarity, score: 50 },
      conciseness: { ...base.conciseness, score: 55 },
      dynamicCriteria: [{ ...base.dynamicCriteria[0], score: 50 }],
    };
    const a = finalizeAssessment(low, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps scores that are out of range", () => {
    const outOfRange = {
      ...base,
      clarity: { ...base.clarity, score: 150 },
      conciseness: { ...base.conciseness, score: -10 },
    };
    const a = finalizeAssessment(outOfRange, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// normalizeDynamicCriteria
// ---------------------------------------------------------------------------
describe("normalizeDynamicCriteria", () => {
  const spec = [
    { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
    { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
  ];

  const raw: DynamicCriterion[] = [
    { key: "define_audience", label: "Audience", bestPractice: "define_audience", score: 70, rationale: "r1", suggestion: "s1" },
    { key: "success_criteria", label: "Success", bestPractice: "success_criteria", score: 65, rationale: "r2", suggestion: "s2" },
  ];

  it("caps to 3 items when no prior criteria are set", () => {
    const many: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "a", score: 50, rationale: "", suggestion: "" },
      { key: "b", label: "B", bestPractice: "b", score: 50, rationale: "", suggestion: "" },
      { key: "c", label: "C", bestPractice: "c", score: 50, rationale: "", suggestion: "" },
      { key: "d", label: "D", bestPractice: "d", score: 50, rationale: "", suggestion: "" },
    ];
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("deduplicates by key when no prior criteria are set", () => {
    const duped: DynamicCriterion[] = [
      { key: "x", label: "X", bestPractice: "x", score: 60, rationale: "", suggestion: "" },
      { key: "x", label: "X-dup", bestPractice: "x", score: 70, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(60); // first occurrence wins
  });

  it("locks to prior spec keys and order", () => {
    const result = normalizeDynamicCriteria(raw, spec);
    expect(result.map((d) => d.key)).toEqual(["define_audience", "success_criteria"]);
  });

  it("updates scores from new raw data while keeping prior spec metadata", () => {
    const updated: DynamicCriterion[] = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience", score: 88, rationale: "improved", suggestion: "keep going" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria", score: 72, rationale: "better", suggestion: "more" },
    ];
    const result = normalizeDynamicCriteria(updated, spec);
    expect(result[0].score).toBe(88);
    expect(result[1].score).toBe(72);
  });

  it("returns empty array for undefined input with no prior", () =>
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]));
});
