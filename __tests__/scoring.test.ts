import { describe, it, expect } from "vitest";
import {
  clamp,
  dimensionScores,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
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
  it("passes through values in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps values below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number types", () => {
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("returns clarity, conciseness, then dynamic scores", () => {
    const result = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("creativity", 90), dynDim("feasibility", 60)],
    });
    expect(result).toEqual([80, 70, 90, 60]);
  });

  it("clamps each score", () => {
    const result = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-10),
      dynamicCriteria: [dynDim("x", 50)],
    });
    expect(result).toEqual([100, 0, 50]);
  });

  it("works with no dynamic criteria", () => {
    const result = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [],
    });
    expect(result).toEqual([70, 80]);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 70, 90])).toBe(80);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 rounds to 81
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles a single score", () => {
    expect(computeOverall([75])).toBe(75);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear floor", () => {
    expect(isReady(85, [80, 90, 85], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 90, 85], 80)).toBe(false);
  });

  it(`returns false when any score is below DIMENSION_FLOOR (${DIMENSION_FLOOR})`, () => {
    expect(isReady(85, [80, 64, 85], 80)).toBe(false);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("is exact at the threshold boundary", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("is exact at the floor boundary", () => {
    expect(isReady(85, [65, 80, 80], 80)).toBe(true);
    expect(isReady(85, [64, 80, 80], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "game",
    clarity: { score: 150, rationale: "good", suggestion: "more" },
    conciseness: { score: -5, rationale: "ok", suggestion: "less" },
    dynamicCriteria: [dynDim("fun", 90), dynDim("feasible", 80)],
    refinedPrompt: "Build a game",
  };

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("computes overall from clamped scores", () => {
    const result = finalizeAssessment(raw, 80);
    // scores: [100, 0, 90, 80] → mean = 270/4 = 67.5 → 68
    expect(result.overall).toBe(68);
  });

  it("sets ready based on threshold and floor — not from model", () => {
    const result = finalizeAssessment(raw, 80);
    // conciseness=0 is below the floor, so not ready
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when not specified", () => {
    const result = finalizeAssessment(raw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("a", 80),
    dynDim("b", 70),
    dynDim("c", 60),
    dynDim("a", 90), // duplicate
  ];

  it("deduplicates by key (first occurrence wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b", "c"]);
    expect(result[0].score).toBe(80); // first 'a' wins
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const many = Array.from({ length: 5 }, (_, i) => dynDim(`k${i}`, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("locks order and labels to prior when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B Label", bestPractice: "bp-b" },
      { key: "a", label: "A Label", bestPractice: "bp-a" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["b", "a"]);
    expect(result[0].label).toBe("B Label"); // prior label wins
    expect(result[0].score).toBe(70); // score from current items
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("filters out items missing a key", () => {
    const messy = [
      { score: 50, rationale: "", suggestion: "" } as unknown as DynamicCriterion,
      dynDim("valid", 70),
    ];
    const result = normalizeDynamicCriteria(messy, null);
    expect(result.length).toBe(1);
    expect(result[0].key).toBe("valid");
  });
});
