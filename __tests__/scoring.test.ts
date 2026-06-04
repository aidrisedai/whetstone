import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, DynamicCriterion } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function dim(score: number) {
  return { score, rationale: "r", suggestion: "s" };
}

function dynDim(key: string, label: string, score: number): DynamicCriterion {
  return { key, label, bestPractice: "bp", score, rationale: "r", suggestion: "s" };
}

function rawAssessment(
  clarityScore: number,
  concisenessScore: number,
  dynamicCriteria: DynamicCriterion[] = [],
): Omit<Assessment, "overall" | "ready" | "threshold"> {
  return {
    projectType: "Game",
    clarity: dim(clarityScore),
    conciseness: dim(concisenessScore),
    dynamicCriteria,
    refinedPrompt: "build a thing",
  };
}

// ── clamp ─────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("keeps values in [0, 100]", () => {
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
    expect(clamp(9999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(75.4)).toBe(75);
    expect(clamp(75.6)).toBe(76);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("hello" as unknown as number)).toBe(0);
    expect(clamp(undefined as unknown as number)).toBe(0);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the sole value for a one-element array", () => {
    expect(computeOverall([70])).toBe(70);
  });

  it("averages correctly", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([0, 100])).toBe(50);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("rounds the average", () => {
    // 80 + 81 = 161 / 2 = 80.5 → rounds to 81
    expect(computeOverall([80, 81])).toBe(81);
  });
});

// ── dimensionScores ───────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns [clarity, conciseness] when no dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([70, 80]);
  });

  it("appends dynamic criterion scores after the fixed two", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("k1", "L1", 90), dynDim("k2", "L2", 65)],
    });
    expect(scores).toEqual([70, 80, 90, 65]);
  });

  it("clamps out-of-range dimension scores", () => {
    const scores = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("is false when scores is empty", () => {
    expect(isReady(100, [], threshold)).toBe(false);
  });

  it("is true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, 65], threshold)).toBe(true);
  });

  it("is false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], threshold)).toBe(false);
  });

  it("is false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 85, DIMENSION_FLOOR - 1], threshold)).toBe(false);
  });

  it("passes exactly at the threshold boundary", () => {
    expect(isReady(80, [80, 65, 65], threshold)).toBe(true);
  });

  it("passes exactly at the DIMENSION_FLOOR boundary", () => {
    expect(isReady(85, [85, DIMENSION_FLOOR, DIMENSION_FLOOR], threshold)).toBe(true);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  it("computes overall as the mean of all clamped scores", () => {
    const raw = rawAssessment(70, 80, [dynDim("k1", "L1", 90)]);
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(80); // (70+80+90)/3
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(rawAssessment(90, 90), 75);
    expect(result.threshold).toBe(75);
  });

  it("marks ready=true when all conditions are met", () => {
    const result = finalizeAssessment(rawAssessment(85, 85, [dynDim("k1", "L1", 80)]), 80);
    expect(result.ready).toBe(true);
  });

  it("marks ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(rawAssessment(50, 60), 80);
    expect(result.ready).toBe(false);
  });

  it("marks ready=false when one dimension is below floor", () => {
    // overall = (80 + 80 + 60) / 3 = 73.3 → 73 — below threshold anyway, but
    // let's also verify the floor check by using scores above threshold average
    const result = finalizeAssessment(rawAssessment(90, 90, [dynDim("k1", "L1", 60)]), 80);
    // overall = (90+90+60)/3 = 80, but 60 < DIMENSION_FLOOR(65)
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing overall", () => {
    const result = finalizeAssessment(rawAssessment(150, -10), 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(50);
  });

  it("does not mutate the raw input object", () => {
    const raw = rawAssessment(150, 80);
    finalizeAssessment(raw, 80);
    expect(raw.clarity.score).toBe(150); // original unchanged
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  it("returns an empty array for undefined input and no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("caps first-turn results to 3 criteria", () => {
    const items = [
      dynDim("k1", "L1", 70),
      dynDim("k2", "L2", 70),
      dynDim("k3", "L3", 70),
      dynDim("k4", "L4", 70),
    ];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("deduplicates by key on the first turn", () => {
    const items = [dynDim("k1", "L1", 70), dynDim("k1", "L1", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("locks to the prior set when prior is provided", () => {
    const prior = [
      { key: "k1", label: "L1", bestPractice: "bp1" },
      { key: "k2", label: "L2", bestPractice: "bp2" },
    ];
    const items = [dynDim("k1", "L1", 90), dynDim("k2", "L2", 75), dynDim("k3", "L3", 80)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("k1");
    expect(result[0].score).toBe(90);
    expect(result[1].key).toBe("k2");
    expect(result[1].score).toBe(75);
  });

  it("uses prior label/bestPractice even if model returns different ones", () => {
    const prior = [{ key: "k1", label: "OriginalLabel", bestPractice: "OriginalBP" }];
    const items = [dynDim("k1", "DifferentLabel", 80)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("OriginalLabel");
    expect(result[0].bestPractice).toBe("OriginalBP");
  });

  it("falls back gracefully when model omits a prior criterion", () => {
    const prior = [{ key: "k1", label: "L1", bestPractice: "bp" }];
    // model returns nothing matching k1
    const result = normalizeDynamicCriteria([], prior);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("k1");
    expect(result[0].score).toBe(0);
  });
});
