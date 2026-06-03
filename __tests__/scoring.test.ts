import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

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
  it("clamps to [0, 100]", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
    expect(clamp(50)).toBe(50);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.7)).toBe(51);
    expect(clamp(50.2)).toBe(50);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number", () => {
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores", () => {
    const result = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 60), dynDim("b", 90)],
    });
    expect(result).toEqual([80, 70, 60, 90]);
  });

  it("clamps each score", () => {
    const result = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-10),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("computeOverall", () => {
  it("computes mean", () => {
    expect(computeOverall([80, 70, 60])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
    expect(computeOverall([75])).toBe(75);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(computeOverall([80, 71])).toBe(76);
  });
});

describe("isReady", () => {
  const threshold = 80;

  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(85, [90, 80, 70], threshold)).toBe(true);
    expect(isReady(80, [80, 65, 65], threshold)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    expect(isReady(79, [90, 80, 70], threshold)).toBe(false);
  });

  it("returns false when any score < floor", () => {
    expect(isReady(85, [90, 80, 64], threshold)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], threshold)).toBe(false);
  });

  it("returns false when exactly at floor boundary (below)", () => {
    expect(isReady(80, [80, 66, 64], threshold)).toBe(false);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("audience", 70)],
    refinedPrompt: "Build something.",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    // mean of [85, 75, 70] = 76.67 → 77
    expect(result.overall).toBe(77);
  });

  it("sets ready=true when threshold is met and floor is cleared", () => {
    const high = {
      ...base,
      clarity: dim(90),
      conciseness: dim(85),
      dynamicCriteria: [dynDim("audience", 80)],
    };
    const result = finalizeAssessment(high, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing", () => {
    const clamped = {
      ...base,
      clarity: dim(150),
      conciseness: dim(-5),
    };
    const result = finalizeAssessment(clamped, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("stamps the provided threshold on the result", () => {
    const result = finalizeAssessment(base, 60);
    expect(result.threshold).toBe(60);
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeSpec = (key: string): CriterionSpec => ({ key, label: key, bestPractice: key });
  const makeDyn = (key: string, score: number): DynamicCriterion => dynDim(key, score);

  it("dedupes by key on first assessment (no prior)", () => {
    const items = [makeDyn("a", 70), makeDyn("a", 80), makeDyn("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on first assessment", () => {
    const items = [makeDyn("a", 70), makeDyn("b", 60), makeDyn("c", 50), makeDyn("d", 40)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior spec order on subsequent assessments", () => {
    const prior = [makeSpec("b"), makeSpec("a")];
    const items = [makeDyn("a", 80), makeDyn("b", 70)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(70);
    expect(result[1].score).toBe(80);
  });

  it("uses prior spec metadata (label, bestPractice), not model-returned metadata", () => {
    const prior = [{ key: "clarity", label: "Sharp Clarity", bestPractice: "clarity_bp" }];
    const items = [{ ...makeDyn("clarity", 75), label: "Different Label", bestPractice: "wrong_bp" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Sharp Clarity");
    expect(result[0].bestPractice).toBe("clarity_bp");
    expect(result[0].score).toBe(75);
  });

  it("returns empty array for undefined/empty input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("handles null/invalid items in the array", () => {
    const items = [null, undefined, makeDyn("a", 70)] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a"]);
  });

  it("falls back to positional match when key missing from model output", () => {
    const prior = [makeSpec("a"), makeSpec("b")];
    const result = normalizeDynamicCriteria([], prior);
    expect(result.length).toBe(2);
    expect(result[0].score).toBe(0); // no match, defaults to 0
  });
});
