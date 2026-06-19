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
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

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
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to integer", () => expect(clamp(72.7)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through valid value", () => expect(clamp(55)).toBe(55));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns single value unchanged", () => expect(computeOverall([60])).toBe(60));
  it("returns rounded mean", () => expect(computeOverall([70, 80, 90])).toBe(80));
  it("rounds fractional means", () => expect(computeOverall([71, 72])).toBe(72));
});

describe("isReady", () => {
  it("returns false with empty scores", () => expect(isReady(80, [], 80)).toBe(false));
  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [79, 80, 80], 80)).toBe(false));
  it("returns false when a dimension is below the floor", () =>
    expect(isReady(80, [64, 85, 90], 80)).toBe(false));
  it("returns true when overall meets threshold and all dims clear floor", () =>
    expect(isReady(80, [70, 80, 90], 80)).toBe(true));
  it("respects a custom threshold", () =>
    expect(isReady(75, [70, 75, 80], 75)).toBe(true));
});

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores in order", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("a", 90), dynDim("b", 60)],
    });
    expect(scores).toEqual([70, 80, 90, 60]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: dim(90),
    conciseness: dim(85),
    dynamicCriteria: [dynDim("define_audience", 88), dynDim("success_criteria", 80)],
    refinedPrompt: "Build it.",
  };

  it("computes overall as the mean of all dimensions", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.overall).toBe(Math.round((90 + 85 + 88 + 80) / 4));
  });

  it("sets ready=true when threshold is met and no floor breach", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const low = { ...base, clarity: dim(60) };
    const a = finalizeAssessment(low, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps scores from the model", () => {
    const over = { ...base, clarity: dim(150) };
    const a = finalizeAssessment(over, 80);
    expect(a.clarity.score).toBe(100);
  });

  it("stamps the threshold into the result", () => {
    const a = finalizeAssessment(base, 70);
    expect(a.threshold).toBe(70);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("clarity", 70),
    dynDim("scope", 80),
    dynDim("clarity", 75), // duplicate key
  ];

  it("dedupes by key on first call (no prior)", () => {
    const out = normalizeDynamicCriteria(items, null);
    expect(out.map((d) => d.key)).toEqual(["clarity", "scope"]);
  });

  it("caps to 3 on first call", () => {
    const many = [
      dynDim("a", 1), dynDim("b", 2), dynDim("c", 3), dynDim("d", 4),
    ];
    expect(normalizeDynamicCriteria(many, null).length).toBe(3);
  });

  it("locks to prior spec set across turns", () => {
    const prior = [
      { key: "scope", label: "Scope", bestPractice: "scope" },
      { key: "clarity", label: "Clarity", bestPractice: "clarity" },
    ];
    const out = normalizeDynamicCriteria(items, prior);
    expect(out.map((d) => d.key)).toEqual(["scope", "clarity"]);
    // preserves the label from the spec
    expect(out[0].label).toBe("Scope");
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80", () => expect(DEFAULT_THRESHOLD).toBe(80));
  it("DIMENSION_FLOOR is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
