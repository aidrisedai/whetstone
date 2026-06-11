import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
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
    expect(clamp(50.6)).toBe(51);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
  });
  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty scores", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("averages correctly", () => {
    expect(computeOverall([80, 90, 70])).toBe(80);
    expect(computeOverall([75, 85])).toBe(80);
  });
  it("rounds the mean", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 → 71
  });
});

describe("isReady", () => {
  it("false when scores is empty", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
  it("false when overall below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });
  it("false when any dimension is below the floor", () => {
    expect(isReady(85, [90, 64, 90], 80)).toBe(false);
  });
  it("true when all conditions met", () => {
    expect(isReady(85, [90, DIMENSION_FLOOR, 90], 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  it("clamps all scores and computes overall + ready deterministically", () => {
    const raw = {
      projectType: "App",
      clarity: dim(110),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("k1", 90), dynDim("k2", 80)],
      refinedPrompt: "Build something cool",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100); // clamped from 110
    expect(result.overall).toBe(Math.round((100 + 70 + 90 + 80) / 4));
    expect(result.threshold).toBe(80);
    expect(result.ready).toBe(result.overall >= 80 && Math.min(100, 70, 90, 80) >= DIMENSION_FLOOR);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first assessment (no prior)", () => {
    const items = [dynDim("a", 80), dynDim("a", 70), dynDim("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first wins
  });

  it("caps to 3 items on first assessment", () => {
    const items = [dynDim("a", 80), dynDim("b", 70), dynDim("c", 60), dynDim("d", 50)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs in order on subsequent assessments", () => {
    const prior = [
      { key: "x", label: "X", bestPractice: "bp" },
      { key: "y", label: "Y", bestPractice: "bp" },
    ];
    const items = [dynDim("y", 90), dynDim("x", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(90);
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
