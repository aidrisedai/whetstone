import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, DynamicCriterion } from "@/lib/types";

const baseDimension = { score: 70, rationale: "ok", suggestion: "improve" };

const makeRaw = (
  clarityScore: number,
  concisenessScore: number,
  dynamics: DynamicCriterion[],
): Omit<Assessment, "overall" | "ready" | "threshold"> => ({
  projectType: "app",
  clarity: { ...baseDimension, score: clarityScore },
  conciseness: { ...baseDimension, score: concisenessScore },
  dynamicCriteria: dynamics,
  refinedPrompt: "test prompt",
});

const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps values below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps values above 100 to 100", () => expect(clamp(110)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(74.6)).toBe(75));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("foo" as unknown as number)).toBe(0));
  it("passes through valid range", () => expect(clamp(50)).toBe(50));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds to nearest integer", () => expect(computeOverall([67, 68])).toBe(68));
  it("single score passes through", () => expect(computeOverall([85])).toBe(85));
});

describe("isReady", () => {
  it("returns true when above threshold and all dimensions clear floor", () =>
    expect(isReady(82, [70, 75, 80], 80)).toBe(true));
  it("returns false when overall below threshold", () =>
    expect(isReady(79, [70, 75, 80], 80)).toBe(false));
  it("returns false when a dimension is below floor", () =>
    expect(isReady(85, [64, 90, 90], 80)).toBe(false));
  it("returns false for empty scores array", () =>
    expect(isReady(90, [], 80)).toBe(false));
  it("exactly at threshold and floor is ready", () =>
    expect(isReady(80, [65, 65], 80)).toBe(true));
  it("one point below floor fails", () =>
    expect(isReady(80, [64, 90], 80)).toBe(false));
});

describe("dimensionScores", () => {
  it("extracts and clamps all scores", () => {
    const scores = dimensionScores({
      clarity: { ...baseDimension, score: 110 },
      conciseness: { ...baseDimension, score: -5 },
      dynamicCriteria: [dyn("a", 75)],
    });
    expect(scores).toEqual([100, 0, 75]);
  });
});

describe("finalizeAssessment", () => {
  it("clamps scores and computes overall", () => {
    const result = finalizeAssessment(makeRaw(120, 50, [dyn("k", 80)]), 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(50);
    expect(result.overall).toBe(Math.round((100 + 50 + 80) / 3));
  });

  it("marks not ready when overall below threshold", () => {
    const result = finalizeAssessment(makeRaw(50, 50, [dyn("k", 50)]), 80);
    expect(result.ready).toBe(false);
  });

  it("marks ready when all dimensions clear floor and overall above threshold", () => {
    const result = finalizeAssessment(makeRaw(85, 85, [dyn("k", 85)]), 80);
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it("marks not ready when a dimension is below floor even with high overall", () => {
    const result = finalizeAssessment(makeRaw(100, 100, [dyn("k", 60)]), 80);
    expect(result.ready).toBe(false);
  });

  it("uses default threshold when not provided", () => {
    const result = finalizeAssessment(makeRaw(85, 85, [dyn("k", 85)]));
    expect(result.threshold).toBe(80);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key, first-wins", () => {
    const items = [dyn("a", 70), dyn("a", 90), dyn("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first assessment", () => {
    const items = [dyn("a", 70), dyn("b", 60), dyn("c", 80), dyn("d", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order when prior is set", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "bp" },
      { key: "a", label: "A", bestPractice: "bp" },
    ];
    const items = [dyn("a", 80), dyn("b", 60)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(60);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(80);
  });

  it("handles undefined items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("clamps scores when locking to prior", () => {
    const prior = [{ key: "a", label: "A", bestPractice: "bp" }];
    const items = [dyn("a", 150)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].score).toBe(100);
  });

  it("falls back to deduped[i] when prior key not found", () => {
    const prior = [{ key: "missing", label: "M", bestPractice: "bp" }];
    const items = [dyn("a", 75)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("missing");
    expect(result[0].score).toBe(75);
  });
});

describe("DIMENSION_FLOOR constant", () => {
  it("is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
