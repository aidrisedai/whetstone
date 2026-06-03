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
import type { Assessment, DynamicCriterion } from "./types";

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(74.6)).toBe(75));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through values in range", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("computes mean and rounds", () => expect(computeOverall([70, 80, 90])).toBe(80));
  it("single value returns itself", () => expect(computeOverall([65])).toBe(65));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(80, [], 80)).toBe(false));
  it("requires overall >= threshold", () => expect(isReady(79, [79, 79], 80)).toBe(false));
  it("requires every score >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 64], 80)).toBe(false); // 64 < 65
  });
  it("passes when overall and floor both met", () => {
    expect(isReady(80, [80, 65, 75], 80)).toBe(true);
  });
  it("respects custom threshold", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70], 75)).toBe(false);
  });
});

const baseDimension = { score: 80, rationale: "good", suggestion: "keep going" };
const rawBase: Omit<Assessment, "overall" | "ready" | "threshold"> = {
  projectType: "Web app",
  clarity: { ...baseDimension, score: 85 },
  conciseness: { ...baseDimension, score: 75 },
  dynamicCriteria: [
    { key: "define_audience", label: "Audience", bestPractice: "define_audience", score: 80, rationale: "ok", suggestion: "name the user" },
  ],
  refinedPrompt: "Build a todo app.",
};

describe("finalizeAssessment", () => {
  it("clamps all scores", () => {
    const raw = {
      ...rawBase,
      clarity: { ...baseDimension, score: 110 },
      conciseness: { ...baseDimension, score: -5 },
    };
    const a = finalizeAssessment(raw, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(rawBase, 80);
    // clarity=85, conciseness=75, dynamic=80 → mean=80
    expect(a.overall).toBe(80);
  });

  it("sets ready=true when overall>=threshold and all dims>=floor", () => {
    const a = finalizeAssessment(rawBase, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when a dimension is below floor", () => {
    const low = {
      ...rawBase,
      conciseness: { ...baseDimension, score: 60 },
    };
    const a = finalizeAssessment(low, 80);
    expect(a.ready).toBe(false);
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(rawBase, 75);
    expect(a.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none passed", () => {
    const a = finalizeAssessment(rawBase);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const spec = { key: "define_audience", label: "Audience", bestPractice: "define_audience" };
  const item: DynamicCriterion = { ...spec, score: 70, rationale: "ok", suggestion: "name user" };

  it("returns empty array for undefined input and no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("dedupes by key", () => {
    const duped = [item, { ...item, score: 90 }];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on first assessment", () => {
    const four = [1, 2, 3, 4].map((i) => ({ ...item, key: `k${i}` }));
    expect(normalizeDynamicCriteria(four, null)).toHaveLength(3);
  });

  it("locks to prior spec keys in order", () => {
    const prior = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
    ];
    const incoming: DynamicCriterion[] = [
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria", score: 55, rationale: "r", suggestion: "s" },
      { key: "define_audience", label: "Audience", bestPractice: "define_audience", score: 77, rationale: "r", suggestion: "s" },
    ];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("define_audience");
    expect(result[0].score).toBe(77);
    expect(result[1].key).toBe("success_criteria");
    expect(result[1].score).toBe(55);
  });

  it("falls back to positional match when key is absent", () => {
    const prior = [{ key: "missing_key", label: "X", bestPractice: "x" }];
    const incoming: DynamicCriterion[] = [
      { key: "something_else", label: "Y", bestPractice: "y", score: 60, rationale: "r", suggestion: "s" },
    ];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result[0].key).toBe("missing_key"); // locked to prior spec
    expect(result[0].score).toBe(60);           // score from positional fallback
  });
});

describe("DIMENSION_FLOOR constant", () => {
  it("is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
