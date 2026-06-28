import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "../scoring";
import type { DynamicCriterion } from "../types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes through in-range value", () => expect(clamp(50)).toBe(50));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dyn("a", 90), dyn("b", 60)],
    });
    expect(scores).toEqual([80, 70, 90, 60]);
  });
});

describe("computeOverall", () => {
  it("averages the scores", () => expect(computeOverall([80, 70, 90])).toBe(80));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 75, 70], 80)).toBe(true);
  });
  it("returns false when overall < threshold", () => {
    expect(isReady(79, [80, 75, 70], 80)).toBe(false);
  });
  it("returns false when a score falls below DIMENSION_FLOOR", () => {
    expect(isReady(82, [80, DIMENSION_FLOOR - 1, 90], 80)).toBe(false);
  });
  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "web",
    clarity: dim(72.4),
    conciseness: dim(68),
    dynamicCriteria: [dyn("ux", 85)],
    refinedPrompt: "build it",
  };

  it("clamps all scores", () => {
    const a = finalizeAssessment({ ...base, clarity: dim(110) });
    expect(a.clarity.score).toBe(100);
  });

  it("computes overall as mean of clamped scores", () => {
    const a = finalizeAssessment(base, 80);
    // clarity=72, conciseness=68, ux=85 → mean=75
    expect(a.overall).toBe(75);
  });

  it("marks ready when overall >= threshold and floor passes", () => {
    const a = finalizeAssessment({ ...base, clarity: dim(90), conciseness: dim(90), dynamicCriteria: [dyn("ux", 90)] }, 80);
    expect(a.ready).toBe(true);
  });

  it("marks not ready below threshold", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.ready).toBe(false);
  });

  it("stamps the active threshold", () => {
    const a = finalizeAssessment(base, 75);
    expect(a.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first call (no prior)", () => {
    const items = [dyn("a", 80), dyn("a", 60), dyn("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("caps to 3 on first call", () => {
    const items = [dyn("a", 80), dyn("b", 70), dyn("c", 60), dyn("d", 90)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior keys when provided", () => {
    const prior = [
      { key: "x", label: "X", bestPractice: "bp" },
      { key: "y", label: "Y", bestPractice: "bp" },
    ];
    const items = [dyn("x", 85), dyn("y", 75), dyn("z", 95)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["x", "y"]);
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
