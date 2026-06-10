import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

describe("clamp", () => {
  it("passes through values in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("clamps values below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("rounds to the nearest integer", () => expect(clamp(50.7)).toBe(51));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for a non-number", () => expect(clamp("foo" as unknown as number)).toBe(0));
});

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value for a one-element array", () => expect(computeOverall([80])).toBe(80));
  it("computes the mean of two values", () => expect(computeOverall([80, 90])).toBe(85));
  it("rounds the mean correctly", () => expect(computeOverall([80, 90, 70])).toBe(80));
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores above floor", () => {
    expect(isReady(85, [80, 90], 80)).toBe(true);
  });
  it("returns true at exactly the threshold and exactly the floor", () => {
    expect(isReady(80, [65, 65], 80)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [80, 90], 80)).toBe(false);
  });
  it("returns false when any dimension is below the floor", () => {
    expect(isReady(85, [60, 90], 80)).toBe(false);
  });
  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("returns clamped scores in [clarity, conciseness, ...dynamic] order", () => {
    const result = dimensionScores({
      clarity: { score: 120, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: 75, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([100, 0, 75]);
  });
});

describe("finalizeAssessment", () => {
  const rawBase = {
    projectType: "web app",
    clarity: { score: 85, rationale: "good", suggestion: "" },
    conciseness: { score: 90, rationale: "tight", suggestion: "" },
    dynamicCriteria: [] as DynamicCriterion[],
    refinedPrompt: "A web app for teens",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(rawBase, 80);
    expect(result.overall).toBe(88); // mean(85, 90) = 87.5 → rounds to 88
  });

  it("sets ready=true when threshold is met and all above floor", () => {
    expect(finalizeAssessment(rawBase, 80).ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    // mean(75, 75) = 75 < threshold 80, both above floor 65
    const low = {
      ...rawBase,
      clarity: { ...rawBase.clarity, score: 75 },
      conciseness: { ...rawBase.conciseness, score: 75 },
    };
    expect(finalizeAssessment(low, 80).ready).toBe(false);
  });

  it("stamps the supplied threshold on the result", () => {
    expect(finalizeAssessment(rawBase, 75).threshold).toBe(75);
  });

  it("clamps out-of-range scores in the output", () => {
    const result = finalizeAssessment({
      ...rawBase,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
    }, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const item = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key.toUpperCase(),
    bestPractice: "",
    score,
    rationale: "",
    suggestion: "",
  });

  it("dedupes by key, keeping the first occurrence", () => {
    const result = normalizeDynamicCriteria([item("a", 80), item("a", 90)], null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80);
  });

  it("caps at 3 items when there is no prior", () => {
    const items = ["a", "b", "c", "d"].map((k) => item(k, 80));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("returns an empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
  });

  it("locks to prior keys when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "specificity", label: "Specificity", bestPractice: "" },
      { key: "creativity", label: "Creativity", bestPractice: "" },
    ];
    const items = [item("creativity", 75), item("specificity", 85)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("specificity");
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("creativity");
    expect(result[1].score).toBe(75);
  });

  it("fills missing keys from prior with score 0", () => {
    const prior: CriterionSpec[] = [
      { key: "specificity", label: "Specificity", bestPractice: "" },
    ];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].key).toBe("specificity");
    expect(result[0].score).toBe(0);
  });
});

describe("constants", () => {
  it("DIMENSION_FLOOR is 65", () => expect(DIMENSION_FLOOR).toBe(65));
  it("DEFAULT_THRESHOLD defaults to 80", () => expect(DEFAULT_THRESHOLD).toBe(80));
});
