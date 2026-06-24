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

describe("clamp", () => {
  it("passes values in range unchanged", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps negatives to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-100)).toBe(0);
  });

  it("clamps values above 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(72.4)).toBe(72);
    expect(clamp(72.6)).toBe(73);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number inputs", () => {
    expect(clamp("hello" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the single value directly", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("averages multiple scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
  });

  it("rounds the mean", () => {
    expect(computeOverall([60, 61])).toBe(61); // 60.5 → 61
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 90, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 90, 70], 80)).toBe(false);
  });

  it("returns false when any score is below the floor", () => {
    // floor is DIMENSION_FLOOR (65)
    expect(isReady(85, [85, 90, 64], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70], 71)).toBe(false);
  });

  it("passes exactly at the floor boundary", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true);
    expect(isReady(80, [80, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
});

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: dim(75),
    conciseness: dim(80),
    dynamicCriteria: [
      { key: "scope", label: "Scope", bestPractice: "bp1", ...dim(70) },
    ],
    refinedPrompt: "A great app",
  };

  it("computes overall as mean of all dimension scores", () => {
    const a = finalizeAssessment(base, 80);
    // scores: 75, 80, 70 → mean = 225/3 = 75
    expect(a.overall).toBe(75);
  });

  it("sets ready=false when overall is below threshold", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.ready).toBe(false);
  });

  it("sets ready=true when overall meets threshold and all dims clear floor", () => {
    const high = {
      ...base,
      clarity: dim(85),
      conciseness: dim(85),
      dynamicCriteria: [{ key: "scope", label: "Scope", bestPractice: "bp1", ...dim(80) }],
    };
    const a = finalizeAssessment(high, 80);
    expect(a.overall).toBe(83);
    expect(a.ready).toBe(true);
  });

  it("clamps out-of-range raw scores", () => {
    const bad = { ...base, clarity: dim(150) };
    const a = finalizeAssessment(bad, 80);
    expect(a.clarity.score).toBe(100);
  });

  it("stamps the threshold onto the result", () => {
    const a = finalizeAssessment(base, 77);
    expect(a.threshold).toBe(77);
  });

  it("uses DEFAULT_THRESHOLD when not provided", () => {
    const a = finalizeAssessment(base);
    expect(typeof a.threshold).toBe("number");
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeCrit = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: `bp_${key}`,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates by key (first wins)", () => {
    const items = [makeCrit("scope", 70), makeCrit("scope", 90), makeCrit("impact", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = [
      makeCrit("a", 70),
      makeCrit("b", 75),
      makeCrit("c", 80),
      makeCrit("d", 85),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec order and keys", () => {
    const prior = [
      { key: "scope", label: "Scope", bestPractice: "bp_scope" },
      { key: "impact", label: "Impact", bestPractice: "bp_impact" },
    ];
    const items = [makeCrit("impact", 88), makeCrit("scope", 72)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(72);
    expect(result[1].key).toBe("impact");
    expect(result[1].score).toBe(88);
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("filters out items without a string key", () => {
    const bad = [{ key: null, label: "x", bestPractice: "y", score: 70, rationale: "r", suggestion: "s" }] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(bad, null);
    expect(result).toHaveLength(0);
  });
});
