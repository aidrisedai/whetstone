import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const dynCrit = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("clamps negative to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(105)).toBe(100));
  it("rounds 99.6 to 100", () => expect(clamp(99.6)).toBe(100));
  it("rounds 50.4 to 50", () => expect(clamp(50.4)).toBe(50));
  it("passes normal values through", () => expect(clamp(75)).toBe(75));
  it("handles 0 and 100 boundaries", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns single value", () => expect(computeOverall([70])).toBe(70));
  it("returns mean of multiple values", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([67, 68])).toBe(68));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns false when overall below threshold", () => expect(isReady(79, [80, 80], 80)).toBe(false));
  it("returns false when a score is below the floor", () => {
    expect(isReady(85, [90, 64], 80)).toBe(false);
  });
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 80], 80)).toBe(true);
  });
  it("uses DIMENSION_FLOOR constant correctly", () => {
    expect(isReady(90, [DIMENSION_FLOOR, 100], 80)).toBe(true);
    expect(isReady(90, [DIMENSION_FLOOR - 1, 100], 80)).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("deduplicates by key, keeping first occurrence", () => {
    const input = [dynCrit("a", 70), dynCrit("a", 90), dynCrit("b", 80)];
    const result = normalizeDynamicCriteria(input, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 without prior", () => {
    const input = [dynCrit("a", 70), dynCrit("b", 80), dynCrit("c", 75), dynCrit("d", 65)];
    expect(normalizeDynamicCriteria(input, null)).toHaveLength(3);
  });

  it("locks to prior keys and pulls latest scores", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "X", bestPractice: "bpx" },
      { key: "y", label: "Y", bestPractice: "bpy" },
    ];
    const items = [dynCrit("x", 88), dynCrit("y", 72)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ key: "x", label: "X", score: 88 });
    expect(result[1]).toMatchObject({ key: "y", label: "Y", score: 72 });
  });

  it("fills missing keys from prior with score 0", () => {
    const prior: CriterionSpec[] = [{ key: "missing", label: "Missing", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0]).toMatchObject({ key: "missing", score: 0 });
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "web app",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynCrit("define_audience", 80)],
    refinedPrompt: "build a todo app",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 80) / 3));
  });

  it("sets ready=true when overall ≥ threshold and all scores ≥ floor", () => {
    const highRaw = {
      ...raw,
      clarity: dim(90),
      conciseness: dim(85),
      dynamicCriteria: [dynCrit("define_audience", 85)],
    };
    const result = finalizeAssessment(highRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const lowRaw = {
      ...raw,
      clarity: dim(60),
      conciseness: dim(60),
      dynamicCriteria: [dynCrit("define_audience", 60)],
    };
    const result = finalizeAssessment(lowRaw, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing", () => {
    const outOfRange = {
      ...raw,
      clarity: dim(150),
      conciseness: dim(-10),
    };
    const result = finalizeAssessment(outOfRange);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold on the result", () => {
    expect(finalizeAssessment(raw, 70).threshold).toBe(70);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    expect(finalizeAssessment(raw).threshold).toBe(DEFAULT_THRESHOLD);
  });
});
