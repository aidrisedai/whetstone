import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
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
  it("rounds non-integer to nearest int", () => expect(clamp(72.6)).toBe(73));
  it("passes through values in range", () => expect(clamp(55)).toBe(55));
  it("handles NaN safely", () => expect(clamp(NaN)).toBe(0));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns exact value for single score", () => expect(computeOverall([80])).toBe(80));
  it("computes mean across multiple scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the result", () => expect(computeOverall([67, 68])).toBe(68));
});

describe("isReady", () => {
  it("returns false when no scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns true when overall meets threshold and all dimensions pass floor", () =>
    expect(isReady(85, [85, 80, 70], 80)).toBe(true));
  it("returns false when overall is below threshold", () =>
    expect(isReady(75, [75, 80, 70], 80)).toBe(false));
  it("returns false when one dimension is below floor", () =>
    expect(isReady(82, [82, 80, 50], 80)).toBe(false));
  it("returns false when dimension exactly at floor-1", () =>
    expect(isReady(82, [82, 80, DIMENSION_FLOOR - 1], 80)).toBe(false));
  it("returns true when dimension is exactly at floor", () =>
    expect(isReady(82, [82, 80, DIMENSION_FLOOR], 80)).toBe(true));
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web App",
    clarity: makeDim(90),
    conciseness: makeDim(80),
    dynamicCriteria: [makeDynamic("define_audience", 70)],
    refinedPrompt: "Build a task tracker",
  };

  it("clamps scores, computes overall, and stamps threshold", () => {
    const a = finalizeAssessment(base);
    expect(a.clarity.score).toBe(90);
    expect(a.conciseness.score).toBe(80);
    expect(a.dynamicCriteria[0].score).toBe(70);
    expect(a.overall).toBe(Math.round((90 + 80 + 70) / 3));
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("sets ready=true when all conditions pass", () => {
    const a = finalizeAssessment(
      { ...base, clarity: makeDim(90), conciseness: makeDim(85), dynamicCriteria: [makeDynamic("x", 75)] },
      80,
    );
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const a = finalizeAssessment(
      { ...base, clarity: makeDim(70), conciseness: makeDim(60), dynamicCriteria: [makeDynamic("x", 55)] },
      80,
    );
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range raw scores", () => {
    const a = finalizeAssessment({ ...base, clarity: makeDim(150), conciseness: makeDim(-10) });
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    makeDynamic("define_audience", 75),
    makeDynamic("success_criteria", 60),
  ];

  it("caps to 3 on first assessment (no prior)", () => {
    const many = [
      makeDynamic("a", 70),
      makeDynamic("b", 71),
      makeDynamic("c", 72),
      makeDynamic("d", 73),
    ];
    expect(normalizeDynamicCriteria(many, null)).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const duped = [makeDynamic("define_audience", 75), makeDynamic("define_audience", 60)];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("define_audience");
  });

  it("locks to prior specs when provided", () => {
    const prior = [{ key: "define_audience", label: "Audience", bestPractice: "define_audience" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("define_audience");
    expect(result[0].score).toBe(75);
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
  });

  it("filters items with non-string keys", () => {
    const bad = [{ key: 123 as unknown as string, label: "x", bestPractice: "x", score: 50, rationale: "", suggestion: "" }];
    expect(normalizeDynamicCriteria(bad, null)).toHaveLength(0);
  });
});
