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
} from "../lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "../lib/types";

const makeDim = (score: number) => ({
  score,
  rationale: "r",
  suggestion: "s",
});

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds decimals", () => expect(clamp(72.6)).toBe(73));
  it("returns NaN-safe 0", () => expect(clamp(NaN)).toBe(0));
  it("passes valid values through", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([60, 61])).toBe(61));
  it("handles single value", () => expect(computeOverall([77])).toBe(77));
});

describe("isReady", () => {
  it("returns false with no scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns true when overall and floor both pass", () =>
    expect(isReady(85, [70, 80, 90], 80)).toBe(true));
  it("returns false when overall is below threshold", () =>
    expect(isReady(75, [70, 80, 90], 80)).toBe(false));
  it("returns false when a dimension is below the floor", () =>
    expect(isReady(85, [60, 90, 90], 80)).toBe(false));
  it("returns false when overall and floor both fail", () =>
    expect(isReady(60, [50, 60, 70], 80)).toBe(false));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: makeDim(70),
      conciseness: makeDim(80),
      dynamicCriteria: [makeDynamic("k1", 90)],
    });
    expect(scores).toEqual([70, 80, 90]);
  });

  it("clamps individual scores", () => {
    const scores = dimensionScores({
      clarity: makeDim(110),
      conciseness: makeDim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web app",
    clarity: makeDim(85),
    conciseness: makeDim(78),
    dynamicCriteria: [makeDynamic("define_audience", 82)],
    refinedPrompt: "Build a web app.",
  };

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((85 + 78 + 82) / 3));
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(raw, 75);
    expect(a.threshold).toBe(75);
  });

  it("sets ready=true when thresholds pass", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low = { ...raw, clarity: makeDim(50), conciseness: makeDim(50), dynamicCriteria: [makeDynamic("k", 50)] };
    const a = finalizeAssessment(low, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range scores on dimensions", () => {
    const a = finalizeAssessment({ ...raw, clarity: makeDim(150) }, 80);
    expect(a.clarity.score).toBe(100);
  });

  it("uses DEFAULT_THRESHOLD when not specified", () => {
    const a = finalizeAssessment(raw);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    makeDynamic("k1", 70),
    makeDynamic("k2", 80),
    makeDynamic("k1", 60), // duplicate key
  ];

  it("dedupes by key (keeps first)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["k1", "k2"]);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first assessment", () => {
    const many = [1, 2, 3, 4].map((i) => makeDynamic(`k${i}`, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior specs when provided", () => {
    const prior: CriterionSpec[] = [
      { key: "k2", label: "K2 label", bestPractice: "bp2" },
      { key: "k1", label: "K1 label", bestPractice: "bp1" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["k2", "k1"]);
    expect(result[0].label).toBe("K2 label");
    expect(result[0].score).toBe(80);
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("filters items with missing key", () => {
    const bad = [{ score: 50, rationale: "", suggestion: "" }] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(bad, null);
    expect(result).toEqual([]);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is between 1 and 100", () => {
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(100);
  });

  it("DIMENSION_FLOOR is less than DEFAULT_THRESHOLD", () => {
    expect(DIMENSION_FLOOR).toBeLessThan(DEFAULT_THRESHOLD);
  });
});
