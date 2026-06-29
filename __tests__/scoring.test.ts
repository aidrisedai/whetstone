import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "ok", suggestion: "try harder" });

describe("clamp", () => {
  it("clamps to 0 at the bottom", () => expect(clamp(-5)).toBe(0));
  it("clamps to 100 at the top", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("passes valid middle values unchanged", () => expect(clamp(50)).toBe(50));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles zero", () => expect(clamp(0)).toBe(0));
  it("handles 100 exactly", () => expect(clamp(100)).toBe(100));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("computes mean for single score", () => expect(computeOverall([80])).toBe(80));
  it("computes mean for multiple scores", () => expect(computeOverall([80, 60])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([80, 61])).toBe(71));
  it("handles all zeroes", () => expect(computeOverall([0, 0, 0])).toBe(0));
  it("handles all 100s", () => expect(computeOverall([100, 100, 100])).toBe(100));
});

describe("isReady", () => {
  const threshold = 80;

  it("returns false for empty scores", () => expect(isReady(80, [], threshold)).toBe(false));
  it("returns true when overall meets threshold and all dimensions above floor", () =>
    expect(isReady(80, [80, 80, 80], threshold)).toBe(true));
  it("returns false when overall is below threshold", () =>
    expect(isReady(79, [79, 79, 79], threshold)).toBe(false));
  it("returns false when one dimension is below floor (65)", () =>
    expect(isReady(85, [85, 85, 64], threshold)).toBe(false));
  it("returns true when overall exactly equals threshold", () =>
    expect(isReady(80, [80, 80, 80], threshold)).toBe(true));
  it("returns false when min dimension exactly equals floor - 1", () =>
    expect(isReady(80, [80, 80, 64], threshold)).toBe(false));
  it("returns true when all dimensions exactly at floor", () =>
    expect(isReady(80, [65, 65, 65, 65], threshold)).toBe(true));
  it("uses the DIMENSION_FLOOR constant (65)", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
  it("uses the DEFAULT_THRESHOLD constant (80)", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeCrit = (key: string, score = 70): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("returns empty array for empty input with no prior", () => {
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("deduplicates by key", () => {
    const items = [makeCrit("clarity"), makeCrit("clarity", 90)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("clarity");
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = [makeCrit("a"), makeCrit("b"), makeCrit("c"), makeCrit("d")];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria keys when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
      { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
    ];
    const items = [
      makeCrit("audience", 75),
      makeCrit("scope", 80),
      makeCrit("extras", 90),
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[1].key).toBe("scope");
    expect(result.find((r) => r.key === "extras")).toBeUndefined();
  });

  it("uses prior labels and bestPractice (not model's)", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Target Audience", bestPractice: "define_audience" },
    ];
    const items = [{ ...makeCrit("audience"), label: "Wrong Label", bestPractice: "wrong" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Target Audience");
    expect(result[0].bestPractice).toBe("define_audience");
  });

  it("handles undefined items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: dim(90),
    conciseness: dim(70),
    dynamicCriteria: [
      { key: "audience", label: "Audience", bestPractice: "define_audience", ...dim(80) },
    ],
    refinedPrompt: "Build a todo app",
  };

  it("computes overall as the mean of all scores", () => {
    const a = finalizeAssessment(raw);
    // (90 + 70 + 80) / 3 = 80
    expect(a.overall).toBe(80);
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(raw, 75);
    expect(a.threshold).toBe(75);
  });

  it("sets ready=true when threshold is met and all dimensions above floor", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const a = finalizeAssessment(raw, 85);
    expect(a.ready).toBe(false);
  });

  it("clamps scores that are out of range", () => {
    const a = finalizeAssessment({
      ...raw,
      clarity: dim(110),
      conciseness: dim(-5),
    });
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const a = finalizeAssessment(raw);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("sets ready=false when a dimension is below floor even if overall is high", () => {
    const a = finalizeAssessment({
      ...raw,
      conciseness: dim(50),
      clarity: dim(100),
      dynamicCriteria: [
        { key: "audience", label: "Audience", bestPractice: "define_audience", ...dim(100) },
      ],
    }, 80);
    // overall = (100 + 50 + 100) / 3 = 83 — but conciseness=50 < DIMENSION_FLOOR=65
    expect(a.ready).toBe(false);
  });
});
