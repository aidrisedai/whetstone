import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "../scoring";
import type { DynamicCriterion } from "../types";

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
  it("rounds and clamps to 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(50.6)).toBe(51);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
  });
  it("returns 0 for non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100])).toBe(100);
  });
  it("returns 0 for empty", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("requires overall >= threshold AND every dim >= floor (65)", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
    expect(isReady(90, [80, 60, 90], 80)).toBe(false);
    expect(isReady(90, [80, 65, 90], 80)).toBe(true);
  });
  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const a = {
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("k1", 90)],
    };
    expect(dimensionScores(a)).toEqual([70, 80, 90]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "game",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("specificity", 80)],
    refinedPrompt: "build a game",
  };

  it("computes overall as mean of all dims", () => {
    const result = finalizeAssessment(base);
    expect(result.overall).toBe(Math.round((85 + 75 + 80) / 3));
  });

  it("sets ready=true when overall >= threshold and all dims >= 65", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(result.overall >= 80);
  });

  it("clamps out-of-range scores", () => {
    const raw = { ...base, clarity: dim(120), conciseness: dim(-10) };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first assessment", () => {
    const items = [dynDim("a", 80), dynDim("b", 70), dynDim("a", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
  });

  it("caps to 3 on first assessment", () => {
    const items = [dynDim("a", 80), dynDim("b", 70), dynDim("c", 60), dynDim("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior spec order when criteria are set", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "bp" },
      { key: "a", label: "A", bestPractice: "bp" },
    ];
    const items = [dynDim("a", 90), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(70);
    expect(result[1].score).toBe(90);
  });

  it("handles missing/null gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
