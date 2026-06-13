import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

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
  it("clamps to 0-100 range", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(50)).toBe(50);
  });
  it("rounds to nearest integer", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });
  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores and rounds", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([33, 66, 99])).toBe(66);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("returns single score unchanged", () => {
    expect(computeOverall([75])).toBe(75);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });
  it("returns false when any score is below the floor", () => {
    // DIMENSION_FLOOR is 65; one score is 64
    expect(isReady(85, [90, 90, 64], 80)).toBe(false);
  });
  it("returns false for empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
  it("uses the provided threshold, not the env default", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 75)).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key on first call (no prior)", () => {
    const items = [dynDim("foo", 50), dynDim("bar", 60), dynDim("foo", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("foo");
    expect(result[0].score).toBe(50); // first occurrence wins
  });

  it("caps to 3 dimensions on first assessment", () => {
    const items = [
      dynDim("a", 50),
      dynDim("b", 60),
      dynDim("c", 70),
      dynDim("d", 80),
    ];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior criteria order and keys on subsequent calls", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B Label", bestPractice: "b_bp" },
      { key: "a", label: "A Label", bestPractice: "a_bp" },
    ];
    const items = [dynDim("a", 90), dynDim("b", 55)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(55);
    expect(result[0].label).toBe("B Label");
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(90);
  });

  it("uses prior label and bestPractice regardless of model output", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "Stable Label", bestPractice: "stable_bp" },
    ];
    const items = [{ ...dynDim("x", 75), label: "Different Label", bestPractice: "other_bp" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Stable Label");
    expect(result[0].bestPractice).toBe("stable_bp");
    expect(result[0].score).toBe(75);
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "Web App",
    clarity: dim(90),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("define_audience", 85), dynDim("success_criteria", 75)],
    refinedPrompt: "Build a task tracker",
  };

  it("computes overall as mean of all dimension scores", () => {
    // (90+80+85+75)/4 = 82.5 → 83 (Math.round)
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(83);
  });

  it("marks ready=true when threshold is crossed and all dims >= floor", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("marks ready=false when a dimension is below the floor", () => {
    const raw = {
      ...baseRaw,
      dynamicCriteria: [dynDim("define_audience", 50), dynDim("success_criteria", 75)],
    };
    const result = finalizeAssessment(raw, 80);
    // 50 < DIMENSION_FLOOR (65), so not ready even if overall > threshold
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores from the model", () => {
    const raw = {
      ...baseRaw,
      clarity: dim(150),
      conciseness: dim(-20),
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("stamps the threshold onto the assessment", () => {
    const result = finalizeAssessment(baseRaw, 90);
    expect(result.threshold).toBe(90);
  });

  it("uses DEFAULT_THRESHOLD when threshold is omitted", () => {
    const result = finalizeAssessment(baseRaw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is a valid integer between 1 and 100", () => {
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(100);
    expect(Number.isInteger(DEFAULT_THRESHOLD)).toBe(true);
  });

  it("DIMENSION_FLOOR is below the DEFAULT_THRESHOLD", () => {
    expect(DIMENSION_FLOOR).toBeLessThan(DEFAULT_THRESHOLD);
  });
});
