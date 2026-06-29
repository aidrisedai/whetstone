import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const makeDyn = (key: string, score: number): DynamicCriterion => ({
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
  it("rounds to nearest integer", () => expect(clamp(72.7)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes valid scores through", () => expect(clamp(80)).toBe(80));
});

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => expect(computeOverall([])).toBe(0));
  it("averages a single score", () => expect(computeOverall([60])).toBe(60));
  it("averages multiple scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the result", () => expect(computeOverall([33, 34, 34])).toBe(34));
});

describe("dimensionScores", () => {
  it("returns two fixed scores when no dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: makeDim(70),
      conciseness: makeDim(80),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([70, 80]);
  });

  it("includes dynamic criteria scores", () => {
    const scores = dimensionScores({
      clarity: makeDim(70),
      conciseness: makeDim(80),
      dynamicCriteria: [makeDyn("audience", 90)],
    });
    expect(scores).toEqual([70, 80, 90]);
  });

  it("clamps out-of-range scores", () => {
    const scores = dimensionScores({
      clarity: makeDim(150),
      conciseness: makeDim(-10),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns false if overall is below threshold", () => {
    expect(isReady(79, [79, 79], 80)).toBe(false);
  });

  it("returns false if any score is below DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 80], 80)).toBe(true);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: makeDim(80),
    conciseness: makeDim(80),
    dynamicCriteria: [makeDyn("audience", 80)],
    refinedPrompt: "Build something great",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(base);
    expect(result.overall).toBe(80);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=true when all dimensions meet threshold and floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const low = { ...base, clarity: makeDim(50), conciseness: makeDim(50), dynamicCriteria: [makeDyn("a", 50)] };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("sets ready=false when one dimension lags below floor", () => {
    const lagging = {
      ...base,
      dynamicCriteria: [makeDyn("audience", DIMENSION_FLOOR - 1)],
    };
    const result = finalizeAssessment({ ...lagging, clarity: makeDim(90), conciseness: makeDim(90) }, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps scores from the model before computing", () => {
    const overclamped = { ...base, clarity: makeDim(200), conciseness: makeDim(-5), dynamicCriteria: [] };
    const result = finalizeAssessment(overclamped);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const a = makeDyn("audience", 70);
  const b = makeDyn("success_criteria", 80);
  const c = makeDyn("scope", 65);

  it("deduplicates by key", () => {
    const result = normalizeDynamicCriteria([a, { ...a, score: 90 }, b], null);
    expect(result.filter((d) => d.key === "audience")).toHaveLength(1);
    expect(result.find((d) => d.key === "audience")!.score).toBe(70);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria([a, b, c, makeDyn("extra", 50)], null);
    expect(result).toHaveLength(3);
  });

  it("locks keys from priorCriteria on subsequent turns", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
    ];
    const result = normalizeDynamicCriteria([a, b, c], prior);
    expect(result.map((d) => d.key)).toEqual(["audience", "success_criteria"]);
  });

  it("uses the latest score for a locked key", () => {
    const prior: CriterionSpec[] = [{ key: "audience", label: "Audience", bestPractice: "define_audience" }];
    const updated = { ...a, score: 88 };
    const result = normalizeDynamicCriteria([updated], prior);
    expect(result[0].score).toBe(88);
  });

  it("handles empty input without crashing", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
