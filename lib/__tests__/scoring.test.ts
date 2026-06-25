import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
  DIMENSION_FLOOR,
} from "../scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "../types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

const makeRaw = (
  clarity: number,
  conciseness: number,
  dynamic: DynamicCriterion[],
): Omit<Assessment, "overall" | "ready" | "threshold"> => ({
  projectType: "web",
  clarity: makeDim(clarity),
  conciseness: makeDim(conciseness),
  dynamicCriteria: dynamic,
  refinedPrompt: "test prompt",
});

describe("clamp", () => {
  it("passes values in range", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(-0.001)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds to integer", () => {
    expect(clamp(75.6)).toBe(76);
    expect(clamp(75.4)).toBe(75);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of all scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0, 0, 0])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(computeOverall([67, 68])).toBe(68); // 67.5 rounds to 68
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dimensions clear floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(90, [70, 70, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor (65)", () => {
    expect(isReady(80, [80, 80, 64], 80)).toBe(false);
    expect(isReady(90, [65, 65, 64], 80)).toBe(false);
  });

  it("returns false when scores array is empty", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("passes exactly at the floor boundary", () => {
    expect(isReady(80, [80, 80, DIMENSION_FLOOR], 80)).toBe(true);
    expect(isReady(80, [80, 80, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic criteria scores", () => {
    const scores = dimensionScores({
      clarity: makeDim(70),
      conciseness: makeDim(80),
      dynamicCriteria: [makeDynamic("k1", 90), makeDynamic("k2", 60)],
    });
    expect(scores).toEqual([70, 80, 90, 60]);
  });

  it("clamps each score before returning", () => {
    const scores = dimensionScores({
      clarity: makeDim(110),
      conciseness: makeDim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  it("computes overall as mean of all dimension scores", () => {
    const a = finalizeAssessment(makeRaw(80, 80, [makeDynamic("k", 80)]), 80);
    expect(a.overall).toBe(80);
  });

  it("sets ready=true when overall and all floors pass", () => {
    const a = finalizeAssessment(makeRaw(85, 80, [makeDynamic("k", 80)]), 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const a = finalizeAssessment(makeRaw(75, 75, [makeDynamic("k", 75)]), 80);
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const a = finalizeAssessment(makeRaw(150, -10, [makeDynamic("k", 999)]), 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
    expect(a.dynamicCriteria[0].score).toBe(100);
  });

  it("stamps the threshold onto the returned assessment", () => {
    const a = finalizeAssessment(makeRaw(85, 85, [makeDynamic("k", 85)]), 75);
    expect(a.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "audience", label: "Audience", bestPractice: "define_audience" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
  ];

  it("caps fresh criteria to 3 on first assessment (no prior)", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const items = [makeDynamic("k", 70), makeDynamic("k", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70); // first wins
  });

  it("locks to prior specs order and keys when prior is provided", () => {
    const items = [
      { ...makeDynamic("scope", 75), label: "WRONG" },
      { ...makeDynamic("audience", 85), label: "WRONG" },
    ];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].key).toBe("audience");
    expect(result[0].label).toBe("Audience"); // label comes from spec
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(75);
  });

  it("returns empty array when given undefined and no prior", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("fills missing keys with score 0 when prior has more keys than model returned", () => {
    const result = normalizeDynamicCriteria([], specs);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(0);
    expect(result[1].score).toBe(0);
  });
});
