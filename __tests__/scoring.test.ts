import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

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
  it("passes values already in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100", () => expect(clamp(105)).toBe(0 + 100));
  it("rounds to nearest integer", () => expect(clamp(50.7)).toBe(51));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages two scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([60, 81])).toBe(71));
  it("handles a single score", () => expect(computeOverall([100])).toBe(100));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns false when overall < threshold", () => expect(isReady(79, [79, 80], 80)).toBe(false));
  it("returns false when a dimension is below the floor", () =>
    expect(isReady(85, [85, 60], 80)).toBe(false));
  it("returns true when all conditions are met", () =>
    expect(isReady(85, [85, 70], 80)).toBe(true));
  it("passes exactly at threshold and floor", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true));
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: dim(110),
    conciseness: dim(-5),
    dynamicCriteria: [dynDim("k1", 75)],
    refinedPrompt: "Build something.",
  };

  it("clamps every individual score", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("computes the overall deterministically", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(computeOverall([100, 0, 75]));
  });

  it("stamps the supplied threshold, not a model-provided one", () => {
    expect(finalizeAssessment(raw, 42).threshold).toBe(42);
    expect(finalizeAssessment(raw, 99).threshold).toBe(99);
  });

  it("sets ready=true only when criteria are actually met", () => {
    const highRaw = {
      projectType: "App",
      clarity: dim(90),
      conciseness: dim(85),
      dynamicCriteria: [dynDim("k1", 80)],
      refinedPrompt: "Build it.",
    };
    expect(finalizeAssessment(highRaw, 80).ready).toBe(true);
    expect(finalizeAssessment(raw, 80).ready).toBe(false);
  });

  it("uses DEFAULT_THRESHOLD when none is supplied", () => {
    expect(finalizeAssessment(raw).threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("a", 70),
    dynDim("b", 80),
    dynDim("c", 60),
    dynDim("d", 90),
  ];

  it("caps to 3 on the first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("dedupes by key", () => {
    const dupes = [dynDim("a", 70), dynDim("a", 80), dynDim("b", 60)];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result.filter((d) => d.key === "a")).toHaveLength(1);
  });

  it("locks to the prior spec set when provided", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "a" },
      { key: "b", label: "B", bestPractice: "b" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("updates scores from fresh items when using prior", () => {
    const prior = [{ key: "a", label: "A", bestPractice: "a" }];
    const fresh = [dynDim("a", 95)];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result[0].score).toBe(95);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
