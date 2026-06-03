import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion } from "../lib/types";

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("leaves a valid mid-range score untouched", () => {
    expect(clamp(75)).toBe(75);
  });

  it("rounds fractional scores", () => {
    expect(clamp(74.6)).toBe(75);
    expect(clamp(74.4)).toBe(74);
  });

  it("clamps 0 and 100 inclusive", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps negative values to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("treats NaN as 0", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("treats non-numbers as 0", () => {
    expect(clamp("75" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the score unchanged for a single value", () => {
    expect(computeOverall([80])).toBe(80);
  });

  it("computes the mean and rounds it", () => {
    expect(computeOverall([70, 80])).toBe(75);
    expect(computeOverall([70, 71])).toBe(71); // 70.5 rounds to 71
  });

  it("handles identical scores", () => {
    expect(computeOverall([60, 60, 60])).toBe(60);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("returns false for empty scores array", () => {
    expect(isReady(85, [], threshold)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 80, 75], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 80, 75], threshold)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR (even with high overall)", () => {
    const lowScore = DIMENSION_FLOOR - 1;
    expect(isReady(85, [95, 95, lowScore], threshold)).toBe(false);
  });

  it("returns true at exactly the floor on every dimension", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, DIMENSION_FLOOR], threshold)).toBe(true);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
  const dynCrit = (score: number): DynamicCriterion => ({
    key: "k",
    label: "L",
    bestPractice: "bp",
    ...dim(score),
  });

  it("computes overall as the mean and stamps threshold", () => {
    const result = finalizeAssessment(
      {
        projectType: "web",
        clarity: dim(80),
        conciseness: dim(80),
        dynamicCriteria: [dynCrit(80)],
        refinedPrompt: "build it",
      },
      80,
    );
    expect(result.overall).toBe(80);
    expect(result.threshold).toBe(80);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const result = finalizeAssessment(
      {
        projectType: "web",
        clarity: dim(150),
        conciseness: dim(-10),
        dynamicCriteria: [],
        refinedPrompt: "build it",
      },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(50);
  });

  it("sets ready=true when the idea clears threshold and floor on all dimensions", () => {
    const result = finalizeAssessment(
      {
        projectType: "game",
        clarity: dim(85),
        conciseness: dim(85),
        dynamicCriteria: [dynCrit(85)],
        refinedPrompt: "make a game",
      },
      80,
    );
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when any dimension lags below DIMENSION_FLOOR", () => {
    const result = finalizeAssessment(
      {
        projectType: "game",
        clarity: dim(95),
        conciseness: dim(95),
        dynamicCriteria: [dynCrit(DIMENSION_FLOOR - 1)],
        refinedPrompt: "make a game",
      },
      80,
    );
    expect(result.ready).toBe(false);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const crit = (key: string, score = 70): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: "bp",
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates items with the same key (keeps first)", () => {
    const result = normalizeDynamicCriteria([crit("a", 70), crit("a", 90)], null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps at 3 items when there are no prior criteria", () => {
    const items = ["a", "b", "c", "d"].map(crit);
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("returns empty array for undefined input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("locks to prior criteria order and identity when prior is provided", () => {
    const prior = [
      { key: "x", label: "X", bestPractice: "bp" },
      { key: "y", label: "Y", bestPractice: "bp" },
    ];
    const fresh = [crit("y", 80), crit("x", 90)];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(90);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(80);
  });

  it("uses prior label/bestPractice even when fresh values differ", () => {
    const prior = [{ key: "k", label: "PriorLabel", bestPractice: "PriorBP" }];
    const fresh = [{ ...crit("k"), label: "FreshLabel", bestPractice: "FreshBP" }];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result[0].label).toBe("PriorLabel");
    expect(result[0].bestPractice).toBe("PriorBP");
  });
});
