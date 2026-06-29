import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("returns the value unchanged when within 0–100", () => {
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

  it("rounds fractional values", () => {
    expect(clamp(72.4)).toBe(72);
    expect(clamp(72.6)).toBe(73);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores correctly", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 -> 81 (Math.round)
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(85, [85, 90, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [85, 90, 80], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, DIMENSION_FLOOR - 1, 90], 80)).toBe(false);
  });

  it("returns false for an empty scores array", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("passes exactly at the threshold and floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("returns clamped scores for clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(85),
      conciseness: dim(75),
      dynamicCriteria: [dyn("originality", 70)],
    });
    expect(scores).toEqual([85, 75, 70]);
  });

  it("clamps out-of-range scores", () => {
    const scores = dimensionScores({
      clarity: dim(-10),
      conciseness: dim(150),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([0, 100]);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates entries by key on first assessment (no prior)", () => {
    const items = [dyn("a", 70), dyn("a", 80), dyn("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first wins
  });

  it("caps to 3 items on first assessment", () => {
    const items = [dyn("a", 70), dyn("b", 60), dyn("c", 80), dyn("d", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to the prior spec order and keys when prior is set", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "bp" },
      { key: "b", label: "B", bestPractice: "bp" },
    ];
    const items = [dyn("b", 55), dyn("a", 88)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(88);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(55);
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
