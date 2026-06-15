import { describe, it, expect, beforeEach } from "vitest";
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
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

describe("clamp", () => {
  it("returns value within [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-numbers", () => {
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the value for a single element", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("averages multiple scores", () => {
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("rounds the average", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 rounds to 71
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(85, [70, 80, 90], 80)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    expect(isReady(75, [70, 80, 90], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [DIMENSION_FLOOR - 1, 80, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("returns true at exact threshold and floor", () => {
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("combines clarity, conciseness, and dynamic scores", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [{ key: "a", label: "A", bestPractice: "", score: 90, rationale: "", suggestion: "" }],
    });
    expect(result).toEqual([80, 70, 90]);
  });

  it("clamps out-of-range scores", () => {
    const result = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("returns empty array for undefined input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("deduplicates by key (first wins)", () => {
    const items: DynamicCriterion[] = [
      { key: "x", label: "X", bestPractice: "bp", score: 70, rationale: "r", suggestion: "s" },
      { key: "x", label: "X2", bestPractice: "bp2", score: 80, rationale: "r2", suggestion: "s2" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items when no prior", () => {
    const items: DynamicCriterion[] = ["a", "b", "c", "d"].map((k) => ({
      key: k,
      label: k.toUpperCase(),
      bestPractice: "",
      score: 75,
      rationale: "",
      suggestion: "",
    }));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior spec keys and order", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bbp" },
      { key: "a", label: "A", bestPractice: "abp" },
    ];
    const items: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "abp", score: 88, rationale: "r", suggestion: "s" },
      { key: "b", label: "B", bestPractice: "bbp", score: 77, rationale: "rb", suggestion: "sb" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(77);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(88);
    expect(result[0].label).toBe("B");
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("is 80 (the built-in default)", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "game",
    clarity: { score: 85, rationale: "clear", suggestion: "" },
    conciseness: { score: 75, rationale: "ok", suggestion: "" },
    dynamicCriteria: [
      { key: "fun", label: "Fun factor", bestPractice: "engaging", score: 90, rationale: "great", suggestion: "" },
    ],
    refinedPrompt: "Build a space shooter",
  };

  it("computes overall as mean of all scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 90) / 3));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.threshold).toBe(80);
  });

  it("sets ready=true when above threshold and floor", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    const result = finalizeAssessment(baseRaw, 90);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment({
      ...baseRaw,
      clarity: { score: 200, rationale: "", suggestion: "" },
    }, 80);
    expect(result.clarity.score).toBe(100);
  });
});
