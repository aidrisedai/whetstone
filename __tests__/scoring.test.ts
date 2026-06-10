import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dyn = (key: string, score: number): DynamicCriterion => ({
  key, label: key, bestPractice: key, score, rationale: "r", suggestion: "s",
});

describe("clamp", () => {
  it("clamps to 0–100 and rounds", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(105)).toBe(100);
    expect(clamp(-5)).toBe(0);
  });
  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the mean, rounded", () => {
    expect(computeOverall([80, 70, 90])).toBe(80);
    expect(computeOverall([70, 71])).toBe(71);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("requires overall >= threshold AND every score >= floor", () => {
    expect(isReady(80, [80, 70, 80], 80)).toBe(true);
    expect(isReady(79, [80, 70, 80], 80)).toBe(false);
    expect(isReady(85, [80, 64, 80], 80)).toBe(false); // one below floor
    expect(isReady(85, [DIMENSION_FLOOR, DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });
  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("extracts all scores, clamped", () => {
    const result = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dyn("a", 120), dyn("b", -5)],
    });
    expect(result).toEqual([80, 70, 100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: dim(80),
    conciseness: dim(70),
    dynamicCriteria: [dyn("a", 90), dyn("b", 70)],
    refinedPrompt: "Build a thing",
  };

  it("computes overall as mean", () => {
    const a = finalizeAssessment(base);
    // scores: 80, 70, 90, 70 → mean = 77.5 → 78
    expect(a.overall).toBe(78);
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(base, 75);
    expect(a.threshold).toBe(75);
  });

  it("marks ready when overall >= threshold and all dimensions >= floor", () => {
    const highBase = {
      ...base,
      clarity: dim(85),
      conciseness: dim(85),
      dynamicCriteria: [dyn("a", 85), dyn("b", 85)],
    };
    const a = finalizeAssessment(highBase, 80);
    expect(a.overall).toBe(85);
    expect(a.ready).toBe(true);
  });

  it("marks not ready when a dimension is below floor (65)", () => {
    const lowBase = {
      ...base,
      dynamicCriteria: [dyn("a", 90), dyn("b", 64)], // one is 64
    };
    const a = finalizeAssessment(lowBase, 75);
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range scores before computing", () => {
    const raw = { ...base, clarity: dim(150), conciseness: dim(-10) };
    const a = finalizeAssessment(raw);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const a = finalizeAssessment(base);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "a", label: "A", bestPractice: "bp_a" },
    { key: "b", label: "B", bestPractice: "bp_b" },
  ];

  it("dedupes by key (first occurrence wins)", () => {
    const items = [dyn("a", 80), dyn("a", 90), dyn("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(80);
  });

  it("caps first assessment to 3 items", () => {
    const items = [dyn("a", 80), dyn("b", 70), dyn("c", 60), dyn("d", 50)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior specs when provided", () => {
    const items = [dyn("a", 82), dyn("b", 72), dyn("c", 62)];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].label).toBe("A");
    expect(result[0].bestPractice).toBe("bp_a");
    expect(result[0].score).toBe(82);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("clamps scores when locking to prior", () => {
    const items = [dyn("a", 150), dyn("b", -5)];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].score).toBe(100);
    expect(result[1].score).toBe(0);
  });
});
