import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

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
  it("clamps to 0–100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(75)).toBe(75);
  });

  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });

  it("rounds to integer", () => {
    expect(clamp(74.6)).toBe(75);
    expect(clamp(74.4)).toBe(74);
  });
});

describe("computeOverall", () => {
  it("returns mean rounded to integer", () => {
    expect(computeOverall([80, 70, 90])).toBe(80);
    expect(computeOverall([80, 71])).toBe(76);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("returns clamped scores for all dimensions", () => {
    const scores = dimensionScores({
      clarity: dim(85),
      conciseness: dim(75),
      dynamicCriteria: [dynDim("audience", 90), dynDim("scope", 60)],
    });
    expect(scores).toEqual([85, 75, 90, 60]);
  });

  it("clamps out-of-range scores", () => {
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("true when overall ≥ threshold and all dimensions ≥ floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(85, [70, 80, 90], 80)).toBe(true);
  });

  it("false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("false when any dimension is below the floor", () => {
    expect(isReady(85, [80, DIMENSION_FLOOR - 1, 90], 80)).toBe(false);
  });

  it("false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "app",
    clarity: dim(80),
    conciseness: dim(70),
    dynamicCriteria: [dynDim("audience", 90)],
    refinedPrompt: "Build X",
  };

  it("computes overall as mean of all scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((80 + 70 + 90) / 3));
  });

  it("marks ready when threshold is met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(result.overall >= 80 && Math.min(80, 70, 90) >= DIMENSION_FLOOR);
  });

  it("clamps raw scores from model", () => {
    const result = finalizeAssessment(
      { ...base, clarity: dim(150), conciseness: dim(-10) },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold", () => {
    expect(finalizeAssessment(base, 75).threshold).toBe(75);
    expect(finalizeAssessment(base, 90).threshold).toBe(90);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key", () => {
    const items = [dynDim("a", 80), dynDim("a", 90), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(80); // first wins
  });

  it("caps to 3 on first assessment", () => {
    const items = [dynDim("a", 80), dynDim("b", 70), dynDim("c", 60), dynDim("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior criteria order on subsequent turns", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "b" },
      { key: "a", label: "A", bestPractice: "a" },
    ];
    const items = [dynDim("a", 80), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(70);
    expect(result[1].score).toBe(80);
  });

  it("handles undefined/null gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
