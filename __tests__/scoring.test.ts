import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
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
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("clamps below 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100", () => expect(clamp(105)).toBe(100));
  it("rounds to integer", () => expect(clamp(45.7)).toBe(46));
  it("passes through valid values", () => expect(clamp(70)).toBe(70));
});

describe("dimensionScores", () => {
  it("includes fixed + dynamic", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dyn("a", 60), dyn("b", 55)],
    });
    expect(scores).toEqual([80, 70, 60, 55]);
  });

  it("clamps scores when extracting", () => {
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-10),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("computeOverall", () => {
  it("averages scores correctly", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("rounds to nearest integer", () => expect(computeOverall([1, 2])).toBe(2));
});

describe("isReady", () => {
  it("returns true when overall and all scores meet thresholds", () => {
    expect(isReady(80, [80, 70, 65], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [90, 90, 90], 80)).toBe(false);
  });

  it("returns false when any score is below the floor", () => {
    expect(isReady(85, [85, 85, 64], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isReady(60, [65, 65, 65], 60)).toBe(true);
    expect(isReady(59, [65, 65, 65], 60)).toBe(false);
  });
});

describe("DEFAULT_THRESHOLD", () => {
  it("defaults to 80", () => expect(DEFAULT_THRESHOLD).toBe(80));
});

describe("DIMENSION_FLOOR", () => {
  it("is 65", () => expect(DIMENSION_FLOOR).toBe(65));
});

describe("finalizeAssessment", () => {
  const rawBase = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dyn("define_audience", 70), dyn("success_criteria", 68)],
    refinedPrompt: "Build a todo app.",
  };

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(rawBase, 80);
    // (85+75+70+68)/4 = 298/4 = 74.5 → 75
    expect(a.overall).toBe(75);
  });

  it("sets ready=false when overall below threshold", () => {
    const a = finalizeAssessment(rawBase, 80);
    expect(a.ready).toBe(false);
  });

  it("sets ready=true when all thresholds met", () => {
    const raw = {
      ...rawBase,
      clarity: dim(85),
      conciseness: dim(82),
      dynamicCriteria: [dyn("define_audience", 80), dyn("success_criteria", 79)],
    };
    const a = finalizeAssessment(raw, 80);
    // (85+82+80+79)/4 = 326/4 = 81.5 → 82; all ≥ 65
    expect(a.ready).toBe(true);
  });

  it("stamps the threshold on the result", () => {
    const a = finalizeAssessment(rawBase, 75);
    expect(a.threshold).toBe(75);
  });

  it("clamps out-of-range scores", () => {
    const raw = { ...rawBase, clarity: dim(150), conciseness: dim(-5) };
    const a = finalizeAssessment(raw, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const a = finalizeAssessment(rawBase);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dyn("core_mechanic", 70),
    dyn("success_criteria", 60),
    dyn("define_audience", 55),
  ];

  it("deduplicates by key", () => {
    const duped = [...items, dyn("core_mechanic", 99)];
    const result = normalizeDynamicCriteria(duped, null);
    const keys = result.map((r) => r.key);
    expect(keys.filter((k) => k === "core_mechanic")).toHaveLength(1);
    // First occurrence wins
    expect(result.find((r) => r.key === "core_mechanic")?.score).toBe(70);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const many = [1, 2, 3, 4].map((i) => dyn(`key${i}`, 50));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs on subsequent assessments", () => {
    const prior: CriterionSpec[] = [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic" },
      { key: "success_criteria", label: "Win/lose", bestPractice: "success_criteria" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    // Should match the prior set order and count
    expect(result.map((r) => r.key)).toEqual(["core_mechanic", "success_criteria"]);
  });

  it("preserves prior labels when locking", () => {
    const prior: CriterionSpec[] = [
      { key: "core_mechanic", label: "The Mechanic", bestPractice: "core_mechanic" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("The Mechanic");
  });

  it("returns empty array for undefined input", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
