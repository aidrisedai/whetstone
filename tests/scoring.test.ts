import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dyn = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("keeps values in 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds to integer", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const result = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dyn("a", 90)],
    });
    expect(result).toEqual([70, 80, 90]);
  });

  it("clamps each score", () => {
    const result = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(85, [85, 90, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [90, 90, 90], 80)).toBe(false);
  });

  it("returns false when any score is below the floor", () => {
    expect(isReady(85, [85, 90, 60], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("boundary: floor value itself passes", () => {
    expect(isReady(80, [80, 80, DIMENSION_FLOOR], 80)).toBe(true);
  });

  it("boundary: one point under floor fails", () => {
    expect(isReady(80, [80, 80, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "App",
    clarity: dim(70),
    conciseness: dim(80),
    dynamicCriteria: [dyn("a", 90)],
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((70 + 80 + 90) / 3));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("sets ready=true when all conditions are met", () => {
    const high: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...base,
      clarity: dim(85),
      conciseness: dim(85),
      dynamicCriteria: [dyn("a", 85)],
    };
    const result = finalizeAssessment(high, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is too low", () => {
    const low: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...base,
      clarity: dim(50),
      conciseness: dim(50),
      dynamicCriteria: [dyn("a", 50)],
    };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range model scores", () => {
    const outOfRange: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...base,
      clarity: dim(150),
      conciseness: dim(-10),
      dynamicCriteria: [],
    };
    const result = finalizeAssessment(outOfRange, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("caps first assessment to 3 dimensions", () => {
    const items = [dyn("a", 70), dyn("b", 80), dyn("c", 90), dyn("d", 100)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const items = [dyn("a", 70), dyn("a", 80), dyn("b", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70);
  });

  it("locks to prior criteria order when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "b" },
      { key: "a", label: "A", bestPractice: "a" },
    ];
    const items = [dyn("a", 70), dyn("b", 80)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(80);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(70);
  });

  it("preserves prior label and bestPractice even when model echoes them", () => {
    const prior: CriterionSpec[] = [{ key: "x", label: "X label", bestPractice: "x bp" }];
    const items = [{ ...dyn("x", 75), label: "different", bestPractice: "different" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("X label");
    expect(result[0].bestPractice).toBe("x bp");
  });

  it("handles undefined/empty items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
