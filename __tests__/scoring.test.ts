import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

const dim = (score: number) => ({
  score,
  rationale: "test",
  suggestion: "test",
});

const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "test",
  suggestion: "test",
});

// ─── clamp ───────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes values in range through unchanged", () => {
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
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

// ─── computeOverall ──────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("computes the mean of scores", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 → rounds to 81
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles a single score", () => {
    expect(computeOverall([75])).toBe(75);
  });
});

// ─── isReady ─────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 79], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor (65)", () => {
    expect(isReady(80, [80, 80, 64], 80)).toBe(false);
  });

  it("returns false for an empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(69, [70, 70, 69], 70)).toBe(false);
  });
});

// ─── dimensionScores ─────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clamped scores for clarity, conciseness, and all dynamic criteria", () => {
    const result = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 60), dynDim("b", 90)],
    });
    expect(result).toEqual([80, 70, 60, 90]);
  });

  it("clamps out-of-range scores", () => {
    const result = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-10),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

// ─── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base = {
    projectType: "web",
    clarity: dim(80),
    conciseness: dim(90),
    dynamicCriteria: [dynDim("scope", 70)],
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((80 + 90 + 70) / 3));
  });

  it("sets ready=true when threshold is met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true); // overall ~80, all >= 65
  });

  it("sets ready=false when a dimension is below the floor", () => {
    const lowBase = {
      ...base,
      dynamicCriteria: [dynDim("scope", 64)],
    };
    const result = finalizeAssessment(lowBase, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing", () => {
    const result = finalizeAssessment(
      { ...base, clarity: dim(200), conciseness: dim(-5) },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

// ─── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key on first call (no prior)", () => {
    const items = [dynDim("a", 70), dynDim("b", 80), dynDim("a", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result.find((r) => r.key === "a")?.score).toBe(70); // first wins
  });

  it("caps to 3 on first call", () => {
    const items = [
      dynDim("a", 70),
      dynDim("b", 80),
      dynDim("c", 90),
      dynDim("d", 60),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior keys on subsequent calls", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "a" },
      { key: "b", label: "B", bestPractice: "b" },
    ];
    const items = [dynDim("a", 75), dynDim("b", 85), dynDim("c", 95)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result.find((r) => r.key === "c")).toBeUndefined();
  });

  it("updates scores from the latest model output when locked to prior", () => {
    const prior = [{ key: "x", label: "X", bestPractice: "x" }];
    const items = [dynDim("x", 88)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].score).toBe(88);
  });

  it("returns empty array for undefined input with no prior", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("defaults missing scores to 0 when locked to prior but no matching item", () => {
    const prior = [{ key: "missing", label: "M", bestPractice: "m" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].score).toBe(0);
  });
});

// ─── constants ───────────────────────────────────────────────────────────────

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80 when env var is unset", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
