import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  DIMENSION_FLOOR,
  normalizeDynamicCriteria,
  finalizeAssessment,
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
  it("keeps value in 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
  });
  it("rounds to integer", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });
  it("returns 0 for non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    // @ts-expect-error intentional bad input
    expect(clamp("abc")).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("computes mean and rounds", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([80, 81])).toBe(81);
  });
  it("single score passes through", () => {
    expect(computeOverall([72])).toBe(72);
  });
});

describe("isReady", () => {
  it("requires overall >= threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });
  it("requires every dimension >= DIMENSION_FLOOR", () => {
    expect(isReady(85, [90, 90, DIMENSION_FLOOR - 1], 80)).toBe(false);
    expect(isReady(85, [90, 90, DIMENSION_FLOOR], 80)).toBe(true);
  });
  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key, caps to 3 on first run", () => {
    const items = [dyn("a", 70), dyn("b", 80), dyn("a", 90), dyn("c", 75), dyn("d", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("locks to prior criteria order and updates scores", () => {
    const prior = [
      { key: "a", label: "A", bestPractice: "bp-a" },
      { key: "b", label: "B", bestPractice: "bp-b" },
    ];
    const items = [dyn("b", 88), dyn("a", 77)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(77);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(88);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    // @ts-expect-error intentional bad input
    expect(normalizeDynamicCriteria(null, null)).toEqual([]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web App",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dyn("feasibility", 90)],
    refinedPrompt: "Build a to-do app",
  };

  it("clamps scores and computes overall deterministically", () => {
    const result = finalizeAssessment({ ...base, clarity: dim(150), conciseness: dim(-10) });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(Math.round((100 + 0 + 90) / 3));
  });

  it("sets ready=true only when all conditions met", () => {
    const allHigh = finalizeAssessment({
      ...base,
      clarity: dim(90),
      conciseness: dim(85),
      dynamicCriteria: [dyn("feasibility", 88)],
    }, 80);
    expect(allHigh.ready).toBe(true);

    const oneWeak = finalizeAssessment({
      ...base,
      clarity: dim(90),
      conciseness: dim(64),
      dynamicCriteria: [dyn("feasibility", 88)],
    }, 80);
    expect(oneWeak.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(base, 70);
    expect(result.threshold).toBe(70);
  });
});
