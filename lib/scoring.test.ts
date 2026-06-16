import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "./scoring";
import type { DynamicCriterion } from "./types";

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
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
  it("passes through valid values", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds to nearest integer", () => expect(computeOverall([67, 68])).toBe(68));
});

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("a", 60), dynDim("b", 90)],
    });
    expect(scores).toEqual([70, 80, 60, 90]);
  });
  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns false when overall below threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });
  it("returns false when any dimension below floor", () => {
    expect(isReady(80, [80, 64, 80], 80)).toBe(false);
  });
  it("returns true when overall meets threshold and all dims clear floor", () => {
    expect(isReady(80, [80, 65, 80], 80)).toBe(true);
  });
  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Game",
    clarity: dim(75),
    conciseness: dim(85),
    dynamicCriteria: [dynDim("core_mechanic", 90)],
    refinedPrompt: "Build a game",
  };

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((75 + 85 + 90) / 3));
  });
  it("stamps the threshold", () => {
    expect(finalizeAssessment(raw, 80).threshold).toBe(80);
  });
  it("sets ready=true when criteria met", () => {
    expect(finalizeAssessment(raw, 80).ready).toBe(true);
  });
  it("sets ready=false when threshold not met", () => {
    expect(finalizeAssessment({ ...raw, clarity: dim(50) }, 80).ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("a", 70),
    dynDim("b", 80),
    dynDim("a", 60), // duplicate
  ];

  it("dedupes by key on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
  });
  it("caps to 3 on first assessment", () => {
    const four = [dynDim("a", 70), dynDim("b", 80), dynDim("c", 90), dynDim("d", 50)];
    expect(normalizeDynamicCriteria(four, null)).toHaveLength(3);
  });
  it("locks to prior criteria order on subsequent assessments", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "b" },
      { key: "a", label: "A", bestPractice: "a" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "a"]);
  });
  it("handles empty items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80", () => expect(DEFAULT_THRESHOLD).toBe(80));
  it("DIMENSION_FLOOR is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
