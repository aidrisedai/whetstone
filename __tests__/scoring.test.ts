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
import type { Assessment, CriterionSpec, DynamicCriterion } from "@/lib/types";

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
  it("clamps to 0–100 and rounds", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(NaN)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages an array of scores", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all dims >= floor", () => {
    expect(isReady(82, [82, 75, 70], 80)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    expect(isReady(79, [79, 75, 70], 80)).toBe(false);
  });

  it("returns false when any dim < floor (65)", () => {
    expect(isReady(82, [82, 64, 70], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores", () => {
    const a = {
      clarity: dim(80),
      conciseness: dim(90),
      dynamicCriteria: [dynDim("audience", 70)],
    };
    expect(dimensionScores(a)).toEqual([80, 90, 70]);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web app",
    clarity: dim(80),
    conciseness: dim(90),
    dynamicCriteria: [dynDim("audience", 70)],
    refinedPrompt: "Build it",
  };

  it("computes overall as mean of all scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((80 + 90 + 70) / 3));
  });

  it("sets ready=true when above threshold and floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(result.overall >= 80 && result.overall > 0);
  });

  it("clamps out-of-range scores", () => {
    const raw = { ...base, clarity: dim(150), conciseness: dim(-5) };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("returns at most 3 items on first assessment (no prior)", () => {
    const items = [
      dynDim("a", 70),
      dynDim("b", 80),
      dynDim("c", 65),
      dynDim("d", 90),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const items = [dynDim("a", 70), dynDim("a", 80), dynDim("b", 65)];
    const result = normalizeDynamicCriteria(items, null);
    const keys = result.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("locks to prior criteria order, pulling latest scores", () => {
    const prior: CriterionSpec[] = [
      { key: "clarity_ext", label: "Clarity+", bestPractice: "clarity_ext" },
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const items = [dynDim("audience", 85), dynDim("clarity_ext", 72)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("clarity_ext");
    expect(result[0].score).toBe(72);
    expect(result[1].key).toBe("audience");
    expect(result[1].score).toBe(85);
  });

  it("preserves prior label and bestPractice on lock", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "Original label", bestPractice: "orig_bp" },
    ];
    const items = [{ ...dynDim("a", 70), label: "New label", bestPractice: "new_bp" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Original label");
    expect(result[0].bestPractice).toBe("orig_bp");
  });

  it("handles empty items gracefully", () => {
    const result = normalizeDynamicCriteria([], null);
    expect(result).toEqual([]);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
