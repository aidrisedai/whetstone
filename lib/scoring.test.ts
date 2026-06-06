import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

describe("clamp", () => {
  it("passes through values in range", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("floors negative values to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-9999)).toBe(0);
  });

  it("caps values above 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(75.4)).toBe(75);
    expect(clamp(75.5)).toBe(76);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number types", () => {
    expect(clamp("foo" as unknown as number)).toBe(0);
    expect(clamp(undefined as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the mean of all scores", () => {
    expect(computeOverall([90, 70, 80])).toBe(80);
    expect(computeOverall([100, 100])).toBe(100);
    expect(computeOverall([0, 0, 0])).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 rounds to 81
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles a single score", () => {
    expect(computeOverall([73])).toBe(73);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all dims >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
    expect(isReady(95, [90, DIMENSION_FLOOR, 88], 80)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    expect(isReady(79, [79, 80, 80], 80)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    const below = DIMENSION_FLOOR - 1;
    expect(isReady(85, [85, below, 90], 80)).toBe(false);
  });

  it("returns false for empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(69, [69, 69, 69], 70)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const dynamicCriteria: DynamicCriterion[] = [
    {
      key: "audience",
      label: "Audience",
      bestPractice: "define_audience",
      score: 80,
      rationale: "Good",
      suggestion: "Be specific",
    },
  ];

  const raw = {
    projectType: "web",
    clarity: { score: 85, rationale: "Clear", suggestion: "Clearer" },
    conciseness: { score: 90, rationale: "Tight", suggestion: "Tighter" },
    dynamicCriteria,
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(raw, 80);
    // (85 + 90 + 80) / 3 = 85
    expect(result.overall).toBe(Math.round((85 + 90 + 80) / 3));
  });

  it("sets ready=true when above threshold and all dims clear floor", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall below threshold", () => {
    const lowRaw = {
      ...raw,
      clarity: { ...raw.clarity, score: 40 },
      conciseness: { ...raw.conciseness, score: 50 },
    };
    const result = finalizeAssessment(lowRaw, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold on the result", () => {
    expect(finalizeAssessment(raw, 90).threshold).toBe(90);
  });

  it("clamps out-of-range dimension scores", () => {
    const outOfRange = {
      ...raw,
      clarity: { ...raw.clarity, score: 150 },
      conciseness: { ...raw.conciseness, score: -20 },
    };
    const result = finalizeAssessment(outOfRange);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("preserves all original fields", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.projectType).toBe("web");
    expect(result.refinedPrompt).toBe("Build a todo app");
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    {
      key: "audience",
      label: "Audience",
      bestPractice: "define_audience",
      score: 70,
      rationale: "ok",
      suggestion: "better",
    },
    {
      key: "scope",
      label: "Scope",
      bestPractice: "set_constraints",
      score: 80,
      rationale: "ok",
      suggestion: "narrow it",
    },
    {
      key: "success",
      label: "Success",
      bestPractice: "success_criteria",
      score: 60,
      rationale: "ok",
      suggestion: "define it",
    },
    {
      key: "extra",
      label: "Extra",
      bestPractice: "extra",
      score: 55,
      rationale: "ok",
      suggestion: "cut",
    },
  ];

  it("caps to 3 on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key on first assessment", () => {
    const dupes: DynamicCriterion[] = [
      { ...items[0] },
      { ...items[0], score: 90 }, // same key, different score
      items[1],
      items[2],
    ];
    const result = normalizeDynamicCriteria(dupes, null);
    const keys = result.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("locks to prior criteria order and keys on subsequent assessments", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "set_constraints" },
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[1].key).toBe("audience");
  });

  it("pulls latest score for each locked criterion", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const updated: DynamicCriterion[] = [{ ...items[0], score: 95 }];
    const result = normalizeDynamicCriteria(updated, prior);
    expect(result[0].score).toBe(95);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("clamps scores via prior path", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const badScore: DynamicCriterion[] = [{ ...items[0], score: 200 }];
    const result = normalizeDynamicCriteria(badScore, prior);
    expect(result[0].score).toBe(100);
  });
});
