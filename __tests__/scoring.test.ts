import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

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
  it("passes values in range", () => expect(clamp(50)).toBe(50));
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to nearest int", () => expect(clamp(74.6)).toBe(75));
  it("handles NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
});

describe("computeOverall", () => {
  it("averages correctly", () => expect(computeOverall([80, 60])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("handles single value", () => expect(computeOverall([75])).toBe(75));
  it("rounds result", () => expect(computeOverall([66, 67])).toBe(67));
});

describe("isReady", () => {
  it("ready when overall >= threshold and all above floor", () =>
    expect(isReady(85, [85, 70], 80)).toBe(true));
  it("not ready when overall below threshold", () =>
    expect(isReady(75, [75, 75], 80)).toBe(false));
  it("not ready when any score below floor", () =>
    expect(isReady(85, [85, 60], 80)).toBe(false));
  it("not ready for empty scores", () => expect(isReady(80, [], 80)).toBe(false));
  it("floor constant is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: dim(82),
    conciseness: dim(78),
    dynamicCriteria: [dynCrit("wow", 80)],
    refinedPrompt: "Build a cool thing",
  };

  it("computes overall correctly", () => {
    const result = finalizeAssessment(base);
    expect(result.overall).toBe(Math.round((82 + 78 + 80) / 3));
  });

  it("stamps threshold", () => {
    const result = finalizeAssessment(base, 85);
    expect(result.threshold).toBe(85);
  });

  it("ready is true when all criteria pass", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(result.overall >= 80);
  });

  it("clamps out-of-range scores", () => {
    const r = finalizeAssessment({ ...base, clarity: dim(150) });
    expect(r.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key", () => {
    const items = [dynCrit("a", 70), dynCrit("a", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first assessment", () => {
    const items = [dynCrit("a", 70), dynCrit("b", 75), dynCrit("c", 80), dynCrit("d", 85)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior keys when prior provided", () => {
    const prior = [{ key: "ux", label: "UX", bestPractice: "bp" }];
    const items = [dynCrit("ux", 75), dynCrit("extra", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("ux");
    expect(result[0].score).toBe(75);
  });

  it("handles undefined items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic", () => {
    const a = { clarity: dim(80), conciseness: dim(70), dynamicCriteria: [dynCrit("x", 60)] };
    expect(dimensionScores(a)).toEqual([80, 70, 60]);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("is a number between 1 and 100", () => {
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(100);
  });
});
