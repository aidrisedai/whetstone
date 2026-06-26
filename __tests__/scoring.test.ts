import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

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
  it("passes through values in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below zero to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-numbers", () => {
    expect(clamp("80" as unknown as number)).toBe(0);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });
});

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the single value unchanged", () => {
    expect(computeOverall([80])).toBe(80);
  });

  it("averages and rounds correctly", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([33, 67, 100])).toBe(67); // 200/3 ≈ 66.67 → rounds to 67
    expect(computeOverall([0, 100])).toBe(50);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores meet the floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(100, [65, 65, 65], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 80, DIMENSION_FLOOR - 1], 80)).toBe(false);
    expect(isReady(90, [64, 90, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and all dynamic criteria", () => {
    const result = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dyn("a", 90), dyn("b", 100)],
    });
    expect(result).toEqual([70, 80, 90, 100]);
  });

  it("clamps scores before returning them", () => {
    const result = dimensionScores({
      clarity: dim(150),
      conciseness: dim(-10),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "Game",
    clarity: dim(75),
    conciseness: dim(80),
    dynamicCriteria: [dyn("mechanic", 85)],
    refinedPrompt: "Build a puzzle game",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    // (75 + 80 + 85) / 3 = 80
    expect(result.overall).toBe(80);
  });

  it("stamps the threshold", () => {
    expect(finalizeAssessment(baseRaw, 75).threshold).toBe(75);
  });

  it("marks ready when overall >= threshold and all scores >= floor", () => {
    expect(finalizeAssessment(baseRaw, 80).ready).toBe(true);
  });

  it("marks not ready when overall is below threshold", () => {
    expect(finalizeAssessment(baseRaw, 81).ready).toBe(false);
  });

  it("marks not ready when a dimension is below the floor", () => {
    const raw = { ...baseRaw, clarity: dim(60) }; // 60 < 65
    expect(finalizeAssessment(raw, 70).ready).toBe(false);
  });

  it("clamps out-of-range model scores", () => {
    const raw = { ...baseRaw, clarity: dim(150), conciseness: dim(-5) };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none is supplied", () => {
    expect(finalizeAssessment(baseRaw).threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const a = dyn("audience", 80);
  const b = dyn("mechanic", 70);
  const c = dyn("output", 60);
  const d = dyn("extra", 50);

  describe("without prior criteria (first turn)", () => {
    it("returns at most 3 items", () => {
      const result = normalizeDynamicCriteria([a, b, c, d], null);
      expect(result.length).toBe(3);
    });

    it("preserves order and values", () => {
      const result = normalizeDynamicCriteria([a, b, c], null);
      expect(result[0].key).toBe("audience");
      expect(result[0].score).toBe(80);
    });

    it("deduplicates by key, keeping the first occurrence", () => {
      const dup = { ...a, score: 99 };
      const result = normalizeDynamicCriteria([a, dup, b], null);
      expect(result.length).toBe(2);
      expect(result[0].score).toBe(80); // first `a` wins
    });

    it("handles undefined / empty input gracefully", () => {
      expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
      expect(normalizeDynamicCriteria([], null)).toEqual([]);
    });
  });

  describe("with prior criteria (subsequent turns)", () => {
    const prior: CriterionSpec[] = [
      { key: "mechanic", label: "Mechanic", bestPractice: "mechanic" },
      { key: "audience", label: "Audience", bestPractice: "audience" },
    ];

    it("locks to the prior spec order and count", () => {
      const result = normalizeDynamicCriteria([a, b, c], prior);
      expect(result.length).toBe(2);
      expect(result[0].key).toBe("mechanic");
      expect(result[1].key).toBe("audience");
    });

    it("carries through the latest scores from the model", () => {
      const result = normalizeDynamicCriteria([a, b], prior);
      expect(result[0].score).toBe(70); // mechanic
      expect(result[1].score).toBe(80); // audience
    });

    it("locks labels and bestPractice to the prior spec, not the model reply", () => {
      const differentLabel = { ...b, label: "CHANGED" };
      const result = normalizeDynamicCriteria([differentLabel], prior);
      expect(result[0].label).toBe("Mechanic"); // prior wins
    });
  });
});
