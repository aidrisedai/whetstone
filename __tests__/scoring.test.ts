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
  it("passes through valid scores", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps out-of-range values", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the mean of all scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([0, 100])).toBe(50);
    expect(computeOverall([75, 85, 90])).toBe(83);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 75, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 70], 80)).toBe(false);
  });

  it("returns false when any score is below the floor (65)", () => {
    expect(isReady(85, [90, 90, 64], 80)).toBe(false);
    expect(isReady(85, [90, 90, 65], 80)).toBe(true);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("returns [clarity, conciseness, ...dynamic] clamped", () => {
    const result = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("audience", 75), dynDim("scope", 65)],
    });
    expect(result).toEqual([80, 70, 75, 65]);
  });

  it("clamps out-of-range scores in dimensions", () => {
    const result = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "Web app",
    clarity: dim(80),
    conciseness: dim(70),
    dynamicCriteria: [dynDim("audience", 75), dynDim("scope", 70)],
    refinedPrompt: "Build something",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(baseRaw, 80);
    // mean([80, 70, 75, 70]) = 73.75 → 74
    expect(result.overall).toBe(74);
  });

  it("sets ready when threshold met and all dims clear the floor", () => {
    const highRaw = {
      ...baseRaw,
      clarity: dim(85),
      conciseness: dim(82),
      dynamicCriteria: [dynDim("a", 80), dynDim("b", 78)],
    };
    const result = finalizeAssessment(highRaw, 80);
    // mean([85, 82, 80, 78]) = 81.25 → 81 >= 80, min = 78 >= 65
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold onto the assessment", () => {
    const result = finalizeAssessment(baseRaw, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps raw scores before computing", () => {
    const raw = { ...baseRaw, clarity: dim(150), conciseness: dim(-10) };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "audience", label: "Audience", bestPractice: "define_audience" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
  ];

  it("caps to 3 on the first assessment (no prior)", () => {
    const items = [
      dynDim("a", 70),
      dynDim("b", 60),
      dynDim("c", 55),
      dynDim("d", 50),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key, keeping first occurrence", () => {
    const items = [dynDim("a", 70), dynDim("a", 80), dynDim("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.find((d) => d.key === "a")?.score).toBe(70);
    expect(result).toHaveLength(2);
  });

  it("locks to prior specs when provided, in order", () => {
    const items = [
      dynDim("scope", 72),
      dynDim("audience", 68),
    ];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(68);
    expect(result[0].label).toBe("Audience");
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(72);
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("preserves the floor constant at 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
