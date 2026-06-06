import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

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
  it("clamps above 100", () => expect(clamp(150)).toBe(100));
  it("clamps below 0", () => expect(clamp(-10)).toBe(0));
  it("rounds fractional values", () => expect(clamp(72.6)).toBe(73));
  it("handles NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
  it("passes through valid range", () => expect(clamp(55)).toBe(55));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds to nearest int", () => expect(computeOverall([70, 71])).toBe(71));
  it("handles single score", () => expect(computeOverall([85])).toBe(85));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("true when all conditions met", () => expect(isReady(85, [70, 80, 90], 80)).toBe(true));
  it("false when overall below threshold", () => expect(isReady(75, [70, 80], 80)).toBe(false));
  it("false when a dimension is below floor", () =>
    expect(isReady(90, [60, 90, 95], 80)).toBe(false));
  it("floor is inclusive", () =>
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true));
  it("exactly at threshold passes", () => expect(isReady(80, [70, 80], 80)).toBe(true));
});

describe("dimensionScores", () => {
  it("includes clarity and conciseness", () => {
    const scores = dimensionScores({ clarity: dim(70), conciseness: dim(80), dynamicCriteria: [] });
    expect(scores).toEqual([70, 80]);
  });

  it("appends dynamic criteria scores", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("specificity", 90)],
    });
    expect(scores).toEqual([70, 80, 90]);
  });

  it("clamps out-of-range scores", () => {
    const scores = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "web app",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("specificity", 90)],
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 90) / 3));
  });

  it("sets ready=true when threshold and floor met", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    const raw = { ...baseRaw, clarity: dim(50), conciseness: dim(60), dynamicCriteria: [dynDim("x", 55)] };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("sets ready=false when a dimension is below floor even with high overall", () => {
    const raw = { ...baseRaw, clarity: dim(60), conciseness: dim(100), dynamicCriteria: [dynDim("x", 100)] };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps scores from the model", () => {
    const raw = { ...baseRaw, clarity: dim(150), conciseness: dim(-10) };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("specificity", 80),
    dynDim("scope", 70),
    dynDim("audience", 60),
    dynDim("extra", 50),
  ];

  it("caps to 3 on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const dupes = [dynDim("specificity", 80), dynDim("specificity", 90)];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80);
  });

  it("handles undefined/null gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("locks to prior spec order when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "bp" },
      { key: "specificity", label: "Specificity", bestPractice: "bp" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["scope", "specificity"]);
    expect(result).toHaveLength(2);
  });

  it("uses latest score from model when prior is set", () => {
    const prior: CriterionSpec[] = [{ key: "specificity", label: "Specificity", bestPractice: "bp" }];
    const updated = [dynDim("specificity", 95)];
    const result = normalizeDynamicCriteria(updated, prior);
    expect(result[0].score).toBe(95);
  });

  it("preserves prior spec identity (key/label/bestPractice) even when model drifts", () => {
    const prior: CriterionSpec[] = [{ key: "specificity", label: "Specificity", bestPractice: "bp" }];
    const drifted = [{ ...dynDim("specificity", 75), label: "Different Label", bestPractice: "different" }];
    const result = normalizeDynamicCriteria(drifted, prior);
    expect(result[0].label).toBe("Specificity");
    expect(result[0].bestPractice).toBe("bp");
  });
});
