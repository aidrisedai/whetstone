import { describe, it, expect } from "vitest";
import {
  clamp,
  dimensionScores,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { Dimension, DynamicCriterion } from "./types";

const dim = (score: number): Dimension => ({ score, rationale: "r", suggestion: "s" });
const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key.toUpperCase(),
  bestPractice: "bp",
  ...dim(score),
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds fractional values", () => expect(clamp(72.4)).toBe(72));
  it("rounds up on .5", () => expect(clamp(72.5)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("abc" as unknown as number)).toBe(0));
  it("passes through valid in-range values", () => expect(clamp(50)).toBe(50));
  it("passes through 0", () => expect(clamp(0)).toBe(0));
  it("passes through 100", () => expect(clamp(100)).toBe(100));
});

describe("dimensionScores", () => {
  it("returns clarity, conciseness, then dynamic scores", () => {
    const result = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dyn("a", 90)],
    });
    expect(result).toEqual([80, 70, 90]);
  });

  it("handles no dynamic criteria", () => {
    const result = dimensionScores({ clarity: dim(80), conciseness: dim(70), dynamicCriteria: [] });
    expect(result).toEqual([80, 70]);
  });
});

describe("computeOverall", () => {
  it("computes the mean", () => expect(computeOverall([60, 80, 70])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds the result", () => expect(computeOverall([67, 68])).toBe(68));
  it("handles a single score", () => expect(computeOverall([75])).toBe(75));
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores meet floor", () =>
    expect(isReady(80, [80, 70, 75], 80)).toBe(true));
  it("returns false when overall is one below threshold", () =>
    expect(isReady(79, [80, 70, 75], 80)).toBe(false));
  it("returns false when one score is below DIMENSION_FLOOR", () =>
    expect(isReady(85, [90, DIMENSION_FLOOR - 1, 90], 80)).toBe(false));
  it("returns false for an empty scores array", () =>
    expect(isReady(100, [], 80)).toBe(false));
  it("accepts a custom threshold", () =>
    expect(isReady(70, [70, 70], 70)).toBe(true));
});

describe("finalizeAssessment", () => {
  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment({
      projectType: "web app",
      clarity: dim(90),
      conciseness: dim(80),
      dynamicCriteria: [dyn("k", 85)],
      refinedPrompt: "test",
    });
    expect(result.overall).toBe(85);
  });

  it("marks ready=true when threshold and floor are met", () => {
    const result = finalizeAssessment({
      projectType: "web app",
      clarity: dim(90),
      conciseness: dim(80),
      dynamicCriteria: [dyn("k", 85)],
      refinedPrompt: "test",
    }, 80);
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("marks ready=false when any dimension is below DIMENSION_FLOOR", () => {
    const result = finalizeAssessment({
      projectType: "web app",
      clarity: dim(90),
      conciseness: dim(60),
      dynamicCriteria: [dyn("k", 90)],
      refinedPrompt: "test",
    }, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range raw scores", () => {
    const result = finalizeAssessment({
      projectType: "web app",
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
      refinedPrompt: "test",
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("returns empty array for undefined input", () =>
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]));

  it("deduplicates items with the same key (keeps first occurrence)", () => {
    const items = [dyn("a", 70), dyn("a", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const items = [dyn("a", 70), dyn("b", 70), dyn("c", 70), dyn("d", 70), dyn("e", 70)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior keys when prior is provided", () => {
    const prior = [
      { key: "x", label: "X", bestPractice: "bp1" },
      { key: "y", label: "Y", bestPractice: "bp2" },
    ];
    const items = [dyn("x", 80), dyn("y", 75), dyn("z", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(["x", "y"]);
  });

  it("preserves prior labels and bestPractice regardless of model output", () => {
    const prior = [{ key: "x", label: "OrigLabel", bestPractice: "origBP" }];
    const items = [{ ...dyn("x", 80), label: "WrongLabel", bestPractice: "wrongBP" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("OrigLabel");
    expect(result[0].bestPractice).toBe("origBP");
  });

  it("uses score 0 and empty strings when prior key is missing from new output", () => {
    const prior = [{ key: "missing", label: "M", bestPractice: "bp" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].score).toBe(0);
    expect(result[0].rationale).toBe("");
  });
});
