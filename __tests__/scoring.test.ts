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
import type { Dimension, DynamicCriterion, CriterionSpec } from "../lib/types";

function dim(score: number): Dimension {
  return { score, rationale: "r", suggestion: "s" };
}

function dynDim(key: string, score: number): DynamicCriterion {
  return { key, label: key, bestPractice: "bp", score, rationale: "r", suggestion: "s" };
}

describe("clamp", () => {
  it("returns value as-is when in range", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds fractional values", () => expect(clamp(74.6)).toBe(75));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("oops" as unknown as number)).toBe(0));
});

describe("computeOverall", () => {
  it("averages scores and rounds", () => expect(computeOverall([80, 90])).toBe(85));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds correctly", () => expect(computeOverall([70, 71])).toBe(71));
});

describe("isReady", () => {
  it("ready when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, 65], 80)).toBe(true);
  });
  it("not ready when overall is below threshold", () => {
    expect(isReady(79, [79, 90, 90], 80)).toBe(false);
  });
  it("not ready when a dimension is below DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 64, 90], 80)).toBe(false);
  });
  it("not ready with empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const result = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("a", 90)],
    });
    expect(result).toEqual([70, 80, 90]);
  });
  it("clamps scores out of range", () => {
    const result = dimensionScores({
      clarity: dim(200),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "app",
    clarity: dim(80),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("k", 80)],
    refinedPrompt: "build me an app",
  };

  it("computes overall from all three dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when threshold met and floor cleared", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when threshold not met", () => {
    const low = { ...base, clarity: dim(50), conciseness: dim(50), dynamicCriteria: [dynDim("k", 50)] };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range model scores", () => {
    const over = { ...base, clarity: dim(150), conciseness: dim(-20), dynamicCriteria: [] };
    const result = finalizeAssessment(over, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("clarity", 70),
    dynDim("audience", 80),
    dynDim("audience", 85), // duplicate
  ];

  it("deduplicates by key (keeps first)", () => {
    const result = normalizeDynamicCriteria(items, null);
    const keys = result.map((d) => d.key);
    expect(keys).toEqual(["clarity", "audience"]);
    expect(result.find((d) => d.key === "audience")!.score).toBe(80);
  });

  it("caps to 3 items without prior", () => {
    const many = ["a", "b", "c", "d"].map((k) => dynDim(k, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec order and keys", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "bp" },
      { key: "clarity", label: "Clarity", bestPractice: "bp" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("audience");
    expect(result[1].key).toBe("clarity");
    expect(result[0].score).toBe(80);
  });

  it("uses prior label/bestPractice even if model drifts", () => {
    const prior: CriterionSpec[] = [{ key: "audience", label: "Who it's for", bestPractice: "define_audience" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Who it's for");
    expect(result[0].bestPractice).toBe("define_audience");
  });

  it("returns empty array for undefined input without prior", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("falls back to 0 score for missing dimension in prior", () => {
    const prior: CriterionSpec[] = [{ key: "missing_key", label: "Missing", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].score).toBe(0);
  });

  it("floors dimension score through clamp when locked to prior", () => {
    const prior: CriterionSpec[] = [{ key: "clarity", label: "Clarity", bestPractice: "bp" }];
    const outOfRange = [dynDim("clarity", 999)];
    const result = normalizeDynamicCriteria(outOfRange, prior);
    expect(result[0].score).toBe(100);
  });
});
