import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
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
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("clamps below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(74.6)).toBe(75));
  it("passes through valid values", () => expect(clamp(50)).toBe(50));
  it("handles 0 boundary", () => expect(clamp(0)).toBe(0));
  it("handles 100 boundary", () => expect(clamp(100)).toBe(100));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns single score unchanged", () => expect(computeOverall([80])).toBe(80));
  it("averages multiple scores", () => expect(computeOverall([80, 60])).toBe(70));
  it("rounds to integer", () => expect(computeOverall([80, 81])).toBe(81));
  it("averages three scores", () => expect(computeOverall([90, 70, 80])).toBe(80));
});

describe("isReady", () => {
  const threshold = 80;

  it("returns false for empty scores", () => expect(isReady(80, [], threshold)).toBe(false));
  it("returns true when overall meets threshold and all above floor", () =>
    expect(isReady(80, [80, 80, 70], threshold)).toBe(true));
  it("returns false when overall below threshold", () =>
    expect(isReady(79, [79, 79, 79], threshold)).toBe(false));
  it("returns false when one dimension below floor", () =>
    expect(isReady(80, [80, 80, 64], threshold)).toBe(false));
  it("floor boundary: exactly 65 passes", () =>
    expect(isReady(80, [80, 80, DIMENSION_FLOOR], threshold)).toBe(true));
  it("floor boundary: 64 fails", () =>
    expect(isReady(80, [80, 80, DIMENSION_FLOOR - 1], threshold)).toBe(false));
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("audience", 80), dynDim("scope", 70)],
    refinedPrompt: "Build something great.",
  };

  it("computes overall as mean of all dimension scores", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((85 + 75 + 80 + 70) / 4));
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(raw, 75);
    expect(a.threshold).toBe(75);
  });

  it("sets ready correctly when above threshold", () => {
    const a = finalizeAssessment(raw, 70);
    expect(a.ready).toBe(true);
  });

  it("sets ready false when below threshold", () => {
    const a = finalizeAssessment(raw, 90);
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const clamped = finalizeAssessment({ ...raw, clarity: dim(150), conciseness: dim(-10) }, 80);
    expect(clamped.clarity.score).toBe(100);
    expect(clamped.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when not specified", () => {
    const a = finalizeAssessment(raw);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("clarity", 70),
    dynDim("scope", 65),
    dynDim("audience", 80),
    dynDim("scope", 90), // duplicate of "scope"
  ];

  it("dedupes by key (first wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    const keys = result.map((d) => d.key);
    expect(keys.filter((k) => k === "scope")).toHaveLength(1);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("locks to prior spec order when prior given", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("scope");
    expect(result[1].key).toBe("audience");
    expect(result).toHaveLength(2);
  });

  it("preserves prior label/bestPractice even when model sends different values", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "My Scope Label", bestPractice: "set_constraints_and_scope" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("My Scope Label");
    expect(result[0].bestPractice).toBe("set_constraints_and_scope");
  });

  it("returns empty array for undefined input and no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters out non-object items", () => {
    const messy = [null, undefined, dynDim("a", 50)] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(messy, null);
    expect(result.every((d) => typeof d.key === "string")).toBe(true);
  });
});
