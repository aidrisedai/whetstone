import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

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
  it("rounds and clamps to 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(50.6)).toBe(51);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(NaN)).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("returns fixed + dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 60), dynDim("b", 90)],
    });
    expect(scores).toEqual([80, 70, 60, 90]);
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

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("computes the mean rounded", () => {
    expect(computeOverall([80, 70, 60])).toBe(70);
    expect(computeOverall([80, 71])).toBe(76); // 151/2 = 75.5 → 76
  });
});

describe("isReady", () => {
  it("requires overall >= threshold", () => {
    expect(isReady(79, [79, 79], 80)).toBe(false);
    expect(isReady(80, [80, 80], 80)).toBe(true);
  });

  it("requires every dimension >= DIMENSION_FLOOR", () => {
    // Overall passes but one dimension is below the floor
    expect(isReady(85, [85, 64], 80)).toBe(false);
    expect(isReady(85, [85, 65], 80)).toBe(true);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(70),
    dynamicCriteria: [dynDim("define_audience", 75)],
    refinedPrompt: "Build something.",
  };

  it("computes overall deterministically", () => {
    const a = finalizeAssessment(baseRaw, 80);
    expect(a.overall).toBe(Math.round((85 + 70 + 75) / 3));
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(baseRaw, 80);
    expect(a.threshold).toBe(80);
  });

  it("sets ready=true when threshold met and floor cleared", () => {
    const highRaw = {
      ...baseRaw,
      clarity: dim(85),
      conciseness: dim(82),
      dynamicCriteria: [dynDim("define_audience", 80)],
    };
    const a = finalizeAssessment(highRaw, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when any dimension lags below floor", () => {
    const lowDynRaw = {
      ...baseRaw,
      clarity: dim(90),
      conciseness: dim(88),
      dynamicCriteria: [dynDim("define_audience", 60)],
    };
    const a = finalizeAssessment(lowDynRaw, 80);
    expect(a.ready).toBe(false);
  });

  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    const a = finalizeAssessment(baseRaw);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("core_mechanic", 70),
    dynDim("success_criteria", 80),
    dynDim("define_audience", 65),
  ];

  it("dedupes by key (first occurrence wins)", () => {
    const dupes = [...items, dynDim("core_mechanic", 99)];
    const result = normalizeDynamicCriteria(dupes, null);
    const cm = result.find((d) => d.key === "core_mechanic");
    expect(cm?.score).toBe(clamp(70)); // first occurrence kept
    expect(result.filter((d) => d.key === "core_mechanic").length).toBe(1);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior specs in order", () => {
    const prior: CriterionSpec[] = [
      { key: "success_criteria", label: "Success criteria", bestPractice: "success_criteria" },
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.length).toBe(2);
    expect(result[0].key).toBe("success_criteria");
    expect(result[0].score).toBe(80);
    expect(result[1].key).toBe("core_mechanic");
    expect(result[1].score).toBe(70);
  });

  it("preserves prior labels/bestPractice even if model sends different values", () => {
    const mutated: DynamicCriterion[] = [
      { ...dynDim("success_criteria", 55), label: "WRONG LABEL", bestPractice: "wrong_key" },
    ];
    const prior: CriterionSpec[] = [
      { key: "success_criteria", label: "Win / lose state", bestPractice: "success_criteria" },
    ];
    const result = normalizeDynamicCriteria(mutated, prior);
    expect(result[0].label).toBe("Win / lose state");
    expect(result[0].bestPractice).toBe("success_criteria");
    expect(result[0].score).toBe(55);
  });

  it("handles empty or undefined input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("fills in missing keys with zeroed fallback when prior has more keys than items", () => {
    const prior: CriterionSpec[] = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
    ];
    const result = normalizeDynamicCriteria([], prior);
    expect(result.length).toBe(2);
    expect(result[0].score).toBe(0);
    expect(result[1].score).toBe(0);
  });
});

describe("DIMENSION_FLOOR", () => {
  it("is between 0 and 100", () => {
    expect(DIMENSION_FLOOR).toBeGreaterThan(0);
    expect(DIMENSION_FLOOR).toBeLessThan(100);
  });
});
