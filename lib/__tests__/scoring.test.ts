import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "../scoring";
import type { DynamicCriterion } from "../types";

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
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.7)).toBe(73));
  it("passes valid values through", () => expect(clamp(55)).toBe(55));
  it("handles NaN → 0", () => expect(clamp(NaN)).toBe(0));
});

describe("computeOverall", () => {
  it("averages scores", () => expect(computeOverall([80, 60])).toBe(70));
  it("rounds correctly", () => expect(computeOverall([80, 61])).toBe(71));
  it("returns 0 for empty list", () => expect(computeOverall([])).toBe(0));
  it("handles single score", () => expect(computeOverall([77])).toBe(77));
});

describe("isReady", () => {
  it("ready when overall >= threshold and all scores >= floor", () =>
    expect(isReady(82, [80, 70, 75], 80)).toBe(true));
  it("not ready when overall < threshold", () =>
    expect(isReady(79, [80, 70, 75], 80)).toBe(false));
  it("not ready when one score is below floor (65)", () =>
    expect(isReady(82, [80, 64, 90], 80)).toBe(false));
  it("returns false for empty scores", () =>
    expect(isReady(90, [], 80)).toBe(false));
  it("exactly at threshold is ready", () =>
    expect(isReady(80, [65, 80, 90], 80)).toBe(true));
  it("exactly at floor is ready", () =>
    expect(isReady(80, [65, 65, 65], 80)).toBe(true));
  it("one point below floor is not ready", () =>
    expect(isReady(80, [64, 80, 90], 80)).toBe(false));
});

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores in order", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("k1", 60), dynDim("k2", 50)],
    });
    expect(scores).toEqual([80, 70, 60, 50]);
  });

  it("clamps out-of-range scores", () => {
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: dim(80),
    conciseness: dim(70),
    dynamicCriteria: [dynDim("define_audience", 75)],
    refinedPrompt: "Build a thing",
  };

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((80 + 70 + 75) / 3));
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(raw, 90);
    expect(a.threshold).toBe(90);
  });

  it("ready = true when all conditions met", () => {
    const highRaw = {
      ...raw,
      clarity: dim(90),
      conciseness: dim(85),
      dynamicCriteria: [dynDim("k", 80)],
    };
    const a = finalizeAssessment(highRaw, 80);
    expect(a.ready).toBe(true);
  });

  it("ready = false when overall is below threshold", () => {
    const a = finalizeAssessment(raw, 80);
    // overall = round((80+70+75)/3) = 75 < 80
    expect(a.ready).toBe(false);
  });

  it("clamps individual scores", () => {
    const a = finalizeAssessment({ ...raw, clarity: dim(150) }, 80);
    expect(a.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("clarity", 70),
    dynDim("scope", 60),
    dynDim("clarity", 80), // duplicate — should be deduped
  ];

  it("dedupes by key (keeps first occurrence)", () => {
    const result = normalizeDynamicCriteria(items, null);
    const keys = result.map((r) => r.key);
    expect(keys.filter((k) => k === "clarity")).toHaveLength(1);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const many = Array.from({ length: 6 }, (_, i) => dynDim(`k${i}`, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("locks to prior specs when provided", () => {
    const prior = [
      { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const incoming: DynamicCriterion[] = [
      dynDim("scope", 77),
      dynDim("audience", 88),
      dynDim("extra", 50),
    ];
    const result = normalizeDynamicCriteria(incoming, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(77);
    expect(result[1].key).toBe("audience");
    expect(result[1].score).toBe(88);
  });

  it("handles undefined items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
