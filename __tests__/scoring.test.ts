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
import type { DynamicCriterion } from "../lib/types";

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
  it("clamps values to 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(99.6)).toBe(100);
  });
  it("returns 0 for NaN or non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores correctly", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([100])).toBe(100);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("rounds to nearest integer", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });
  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(90, [90, 90, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("collects and clamps all scores", () => {
    const result = dimensionScores({
      clarity: dim(75),
      conciseness: dim(120),
      dynamicCriteria: [dynDim("a", 60), dynDim("b", -5)],
    });
    expect(result).toEqual([75, 100, 60, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: dim(75),
    conciseness: dim(85),
    dynamicCriteria: [dynDim("define_audience", 70), dynDim("core_mechanic", 80)],
    refinedPrompt: "A cool app",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((75 + 85 + 70 + 80) / 4));
  });

  it("sets ready true when threshold and floor are met", () => {
    const result = finalizeAssessment(base, 70);
    expect(result.ready).toBe(true);
  });

  it("sets ready false when overall is below threshold", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("a", 70),
    dynDim("b", 80),
    dynDim("a", 90), // duplicate of "a"
  ];

  it("deduplicates by key (first wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result.find((d) => d.key === "a")?.score).toBe(70);
  });

  it("caps to 3 on first assessment", () => {
    const many = ["a", "b", "c", "d"].map((k) => dynDim(k, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior spec order when prior is provided", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "bp" },
      { key: "a", label: "A", bestPractice: "bp" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["b", "a"]);
  });

  it("handles undefined input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
