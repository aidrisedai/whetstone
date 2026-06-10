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
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────
describe("clamp", () => {
  it("returns value unchanged when in range", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps negative to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-9999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds fractional scores", () => {
    expect(clamp(72.4)).toBe(72);
    expect(clamp(72.5)).toBe(73);
  });

  it("handles NaN safely", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("handles non-numbers safely", () => {
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────
describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0, 0, 0])).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 rounds up
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles single score", () => {
    expect(computeOverall([77])).toBe(77);
  });
});

// ── isReady ────────────────────────────────────────────────────────────────
describe("isReady", () => {
  it("returns true when overall >= threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(90, [70, 80, 90], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    const belowFloor = DIMENSION_FLOOR - 1;
    expect(isReady(85, [85, 85, belowFloor], 80)).toBe(false);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 71)).toBe(false);
  });
});

// ── dimensionScores ────────────────────────────────────────────────────────
describe("dimensionScores", () => {
  it("returns clarity, conciseness, and dynamic scores in order", () => {
    const assessment = {
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 75, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "L1", bestPractice: "bp1", score: 70, rationale: "", suggestion: "" },
      ],
    };
    expect(dimensionScores(assessment)).toEqual([80, 75, 70]);
  });

  it("clamps out-of-range scores", () => {
    const assessment = {
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    };
    expect(dimensionScores(assessment)).toEqual([100, 0]);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────
describe("finalizeAssessment", () => {
  const makeRaw = (overrides: Partial<{
    clarity: number;
    conciseness: number;
    dynamic: number[];
  }> = {}) => ({
    projectType: "Web app",
    clarity: { score: overrides.clarity ?? 80, rationale: "r", suggestion: "s" },
    conciseness: { score: overrides.conciseness ?? 78, rationale: "r", suggestion: "s" },
    dynamicCriteria: (overrides.dynamic ?? [72, 74]).map((score, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: `bp${i}`,
      score,
      rationale: "r",
      suggestion: "s",
    })),
    refinedPrompt: "Build a nice app.",
  });

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(makeRaw({ clarity: 80, conciseness: 80, dynamic: [80] }));
    expect(result.overall).toBe(80);
  });

  it("stamps the threshold value", () => {
    const result = finalizeAssessment(makeRaw(), 75);
    expect(result.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(makeRaw());
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("marks ready=true when crossing the threshold", () => {
    const result = finalizeAssessment(makeRaw({ clarity: 85, conciseness: 85, dynamic: [85] }), 80);
    expect(result.ready).toBe(true);
  });

  it("marks ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(makeRaw({ clarity: 70, conciseness: 70, dynamic: [70] }), 80);
    expect(result.ready).toBe(false);
  });

  it("marks ready=false even at high overall when a dimension lags below DIMENSION_FLOOR", () => {
    const floor = DIMENSION_FLOOR - 1;
    const result = finalizeAssessment(
      makeRaw({ clarity: 95, conciseness: 95, dynamic: [floor] }),
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const result = finalizeAssessment(makeRaw({ clarity: 110, conciseness: -5 }));
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────
describe("normalizeDynamicCriteria", () => {
  const makeCrit = (key: string, score: number): DynamicCriterion => ({
    key,
    label: `Label ${key}`,
    bestPractice: `bp_${key}`,
    score,
    rationale: "r",
    suggestion: "s",
  });

  const makeSpec = (key: string): CriterionSpec => ({
    key,
    label: `Label ${key}`,
    bestPractice: `bp_${key}`,
  });

  it("deduplicates by key, keeping first occurrence", () => {
    const items = [makeCrit("a", 70), makeCrit("a", 90), makeCrit("b", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 when there is no prior criteria", () => {
    const items = ["a", "b", "c", "d", "e"].map((k) => makeCrit(k, 75));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to the prior spec set and maps scores from matching keys", () => {
    const prior = [makeSpec("clarity_extra"), makeSpec("scope")];
    const items = [makeCrit("scope", 88), makeCrit("clarity_extra", 72)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("clarity_extra");
    expect(result[0].score).toBe(72);
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(88);
  });

  it("falls back to positional match when key is not found in items", () => {
    const prior = [makeSpec("missing_key")];
    const items = [makeCrit("other_key", 65)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("missing_key");
    expect(result[0].score).toBe(65); // positional fallback
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters out null/malformed items", () => {
    const items = [null, undefined, { key: "good", score: 70, label: "L", bestPractice: "bp", rationale: "", suggestion: "" }];
    const result = normalizeDynamicCriteria(items as unknown as DynamicCriterion[], null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("good");
  });
});
