import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "../lib/types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps values above 100", () => expect(clamp(150)).toBe(100));
  it("clamps values below 0", () => expect(clamp(-10)).toBe(0));
  it("rounds fractional values", () => expect(clamp(72.4)).toBe(72));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through valid values", () => expect(clamp(55)).toBe(55));
});

describe("dimensionScores", () => {
  it("returns all clamped scores in order", () => {
    const scores = dimensionScores({
      clarity: makeDim(80),
      conciseness: makeDim(70),
      dynamicCriteria: [makeDynamic("a", 90), makeDynamic("b", 60)],
    });
    expect(scores).toEqual([80, 70, 90, 60]);
  });

  it("clamps out-of-range model scores", () => {
    const scores = dimensionScores({
      clarity: makeDim(120),
      conciseness: makeDim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("handles single score", () => expect(computeOverall([83])).toBe(83));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds the mean", () => expect(computeOverall([80, 81])).toBe(81));
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [90, DIMENSION_FLOOR - 1, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("gate requires both overall and floor to be cleared", () => {
    // All above floor but overall just under threshold
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web app",
    clarity: makeDim(85),
    conciseness: makeDim(75),
    dynamicCriteria: [makeDynamic("define_audience", 80)],
    refinedPrompt: "Build an app.",
  };

  it("computes overall correctly", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 80) / 3));
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=true when gate is cleared", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when threshold not met", () => {
    const result = finalizeAssessment(base, 99);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range model scores", () => {
    const result = finalizeAssessment({ ...base, clarity: makeDim(120) }, 80);
    expect(result.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    makeDynamic("clarity", 70),
    makeDynamic("scope", 65),
    makeDynamic("audience", 80),
    makeDynamic("extra", 50),
  ];

  it("caps to 3 on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const dupes = [makeDynamic("a", 50), makeDynamic("a", 70)];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
    // First occurrence wins on dedup
    expect(result[0].score).toBe(50);
  });

  it("locks to prior keys when prior exists", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "scope" },
      { key: "audience", label: "Audience", bestPractice: "audience" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(["scope", "audience"]);
    // Preserves prior label/bestPractice exactly
    expect(result[0].label).toBe("Scope");
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
