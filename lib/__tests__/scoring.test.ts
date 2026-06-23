import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  DIMENSION_FLOOR,
  finalizeAssessment,
  normalizeDynamicCriteria,
} from "../scoring";

describe("clamp", () => {
  it("rounds and clamps to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(50.6)).toBe(51);
  });

  it("returns 0 for non-numeric input", () => {
    expect(clamp(NaN)).toBe(0);
    // @ts-expect-error intentional bad input
    expect(clamp("abc")).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the rounded mean", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([70, 71])).toBe(71);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("is ready when overall ≥ threshold AND every score ≥ floor", () => {
    expect(isReady(80, [80, 70, 65], 80)).toBe(true);
  });

  it("is not ready when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 65], 80)).toBe(false);
  });

  it("is not ready when any score is below the floor", () => {
    expect(isReady(85, [85, 85, 64], 80)).toBe(false);
  });

  it("is not ready with empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 75)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    clarity: { score: 85, rationale: "clear", suggestion: "none" },
    conciseness: { score: 110, rationale: "brief", suggestion: "none" },
    dynamicCriteria: [
      { key: "market", label: "Market", bestPractice: "TAM", score: -10, rationale: "", suggestion: "" },
    ],
    criteriaSpecs: [],
  };

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.conciseness.score).toBe(100);
    expect(result.dynamicCriteria[0].score).toBe(0);
  });

  it("stamps threshold and computes overall", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
    expect(result.overall).toBe(computeOverall([85, 100, 0]));
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  const item = (key: string, score: number) => ({
    key,
    label: key,
    bestPractice: "bp",
    score,
    rationale: "",
    suggestion: "",
  });

  it("deduplicates by key (first wins)", () => {
    const result = normalizeDynamicCriteria([item("a", 70), item("a", 80)], null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 when no prior specs", () => {
    const input = ["a", "b", "c", "d"].map((k) => item(k, 70));
    expect(normalizeDynamicCriteria(input, null)).toHaveLength(3);
  });

  it("locks to prior spec order when prior is provided", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "bp" },
      { key: "a", label: "A", bestPractice: "bp" },
    ];
    const result = normalizeDynamicCriteria([item("a", 70), item("b", 80)], prior);
    expect(result[0].key).toBe("b");
    expect(result[1].key).toBe("a");
  });

  it("handles undefined or empty input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});

describe("DIMENSION_FLOOR constant", () => {
  it("is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
