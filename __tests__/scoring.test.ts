import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  normalizeDynamicCriteria,
  finalizeAssessment,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------
describe("clamp", () => {
  it("passes values in 0–100 range unchanged", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("floors values below 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("caps values above 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(72.4)).toBe(72);
    expect(clamp(72.5)).toBe(73);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeOverall
// ---------------------------------------------------------------------------
describe("computeOverall", () => {
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the value itself for a single score", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("averages a set of scores", () => {
    expect(computeOverall([80, 60, 70])).toBe(70);
  });

  it("rounds the result", () => {
    // (70 + 71) / 2 = 70.5 → rounds to 71
    expect(computeOverall([70, 71])).toBe(71);
  });
});

// ---------------------------------------------------------------------------
// isReady
// ---------------------------------------------------------------------------
describe("isReady", () => {
  const threshold = 80;

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 70, 70], threshold)).toBe(false);
  });

  it("returns false when a dimension is below DIMENSION_FLOOR", () => {
    const scores = [80, 80, DIMENSION_FLOOR - 1];
    expect(isReady(80, scores, threshold)).toBe(false);
  });

  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    const scores = [80, 80, DIMENSION_FLOOR];
    expect(isReady(80, scores, threshold)).toBe(true);
  });

  it("returns false for an empty scores array", () => {
    expect(isReady(80, [], threshold)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70], 71)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeDynamicCriteria
// ---------------------------------------------------------------------------
const makeCriterion = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

const makeSpec = (key: string): CriterionSpec => ({
  key,
  label: key,
  bestPractice: key,
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key on first call (no prior)", () => {
    const items = [makeCriterion("a", 70), makeCriterion("a", 80), makeCriterion("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first occurrence wins
    expect(result[1].key).toBe("b");
  });

  it("caps to 3 on first call", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeCriterion(k, 50));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria keys and order on subsequent calls", () => {
    const prior: CriterionSpec[] = [makeSpec("x"), makeSpec("y")];
    const items = [makeCriterion("y", 75), makeCriterion("x", 85)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(75);
  });

  it("returns 0 score for a prior key not found in items", () => {
    const prior: CriterionSpec[] = [makeSpec("missing")];
    const result = normalizeDynamicCriteria([], prior);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(0);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// finalizeAssessment
// ---------------------------------------------------------------------------
describe("finalizeAssessment", () => {
  const base = {
    projectType: "App",
    clarity: { score: 80, rationale: "", suggestion: "" },
    conciseness: { score: 70, rationale: "", suggestion: "" },
    dynamicCriteria: [makeCriterion("define_audience", 75)],
    refinedPrompt: "Build something",
  };

  it("clamps all scores", () => {
    const raw = {
      ...base,
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -10, rationale: "", suggestion: "" },
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("computes overall as the mean of all dimension scores", () => {
    // clarity=80, conciseness=70, dynamic=75 → mean = 75
    const result = finalizeAssessment(base);
    expect(result.overall).toBe(75);
  });

  it("sets ready=false when overall < threshold", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(false);
  });

  it("sets ready=true when overall >= threshold and all dims >= floor", () => {
    const highBase = {
      ...base,
      clarity: { score: 85, rationale: "", suggestion: "" },
      conciseness: { score: 85, rationale: "", suggestion: "" },
      dynamicCriteria: [makeCriterion("define_audience", 85)],
    };
    const result = finalizeAssessment(highBase, 80);
    // overall = (85+85+85)/3 = 85; all >= DIMENSION_FLOOR(65)
    expect(result.ready).toBe(true);
  });

  it("stamps the active threshold on the result", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.threshold).toBe(90);
  });

  it("uses DEFAULT_THRESHOLD when no threshold arg is provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});
