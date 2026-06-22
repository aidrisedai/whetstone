import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { Assessment, DynamicCriterion } from "../lib/types";

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const makeDyn = (key: string, score: number): DynamicCriterion => ({
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
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("handles NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes valid mid-range value through", () => expect(clamp(55)).toBe(55));
});

describe("computeOverall", () => {
  it("returns mean of scores", () => expect(computeOverall([80, 60, 100])).toBe(80));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds the mean", () => expect(computeOverall([33, 34])).toBe(34));
});

describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores", () => {
    const scores = dimensionScores({
      clarity: makeDim(80),
      conciseness: makeDim(70),
      dynamicCriteria: [makeDyn("a", 90)],
    });
    expect(scores).toEqual([80, 70, 90]);
  });
});

describe("isReady", () => {
  it("is ready when overall >= threshold and all >= floor", () => {
    expect(isReady(85, [85, 80, 70], 80)).toBe(true);
  });

  it("is not ready when overall < threshold", () => {
    expect(isReady(75, [75, 80, 70], 80)).toBe(false);
  });

  it("is not ready when a dimension is below the floor", () => {
    // overall = 80, but one dim at 60 < DIMENSION_FLOOR (65)
    expect(isReady(80, [90, 90, 60], 80)).toBe(false);
  });

  it("is not ready with an empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web app",
    clarity: makeDim(90),
    conciseness: makeDim(85),
    dynamicCriteria: [makeDyn("audience", 80)],
    refinedPrompt: "a sharp prompt",
  };

  it("computes overall deterministically", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(Math.round((90 + 85 + 80) / 3));
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=true when bar is cleared", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when bar not cleared", () => {
    // Lower scores so overall < 80
    const lowRaw = {
      ...raw,
      clarity: makeDim(50),
      conciseness: makeDim(55),
      dynamicCriteria: [makeDyn("audience", 60)],
    };
    const result = finalizeAssessment(lowRaw, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing", () => {
    const result = finalizeAssessment({ ...raw, clarity: makeDim(120) }, 80);
    expect(result.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first assessment", () => {
    const dupes = [makeDyn("a", 70), makeDyn("a", 80), makeDyn("b", 60)];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first occurrence wins on dedupe
  });

  it("caps to 3 on first assessment", () => {
    const many = ["a", "b", "c", "d"].map((k) => makeDyn(k, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order on subsequent turns", () => {
    const prior = [
      { key: "x", label: "X", bestPractice: "x" },
      { key: "y", label: "Y", bestPractice: "y" },
    ];
    const current = [makeDyn("y", 90), makeDyn("x", 75)];
    const result = normalizeDynamicCriteria(current, prior);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(75);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(90);
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD defaults to 80", () => expect(DEFAULT_THRESHOLD).toBe(80));
  it("DIMENSION_FLOOR is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});
