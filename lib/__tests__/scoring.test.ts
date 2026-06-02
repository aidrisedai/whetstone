import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "../types";

// ── helpers ──────────────────────────────────────────────────────────────────

function dim(score: number) {
  return { score, rationale: "r", suggestion: "s" };
}

function dynCrit(key: string, score: number): DynamicCriterion {
  return { key, label: key, bestPractice: key, score, rationale: "r", suggestion: "s" };
}

function spec(key: string): CriterionSpec {
  return { key, label: key, bestPractice: key };
}

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("clamps values below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("passes through mid-range values", () => expect(clamp(75)).toBe(75));
  it("rounds to nearest integer", () => expect(clamp(74.6)).toBe(75));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
  it("handles boundary 0", () => expect(clamp(0)).toBe(0));
  it("handles boundary 100", () => expect(clamp(100)).toBe(100));
});

// ── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value when length is 1", () => expect(computeOverall([70])).toBe(70));
  it("computes mean correctly", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([60, 81])).toBe(71));
  it("handles all-zero scores", () => expect(computeOverall([0, 0, 0])).toBe(0));
  it("handles all-max scores", () => expect(computeOverall([100, 100, 100])).toBe(100));
});

// ── dimensionScores ───────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns [clarity, conciseness, ...dynamic] in order", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynCrit("a", 60), dynCrit("b", 50)],
    });
    expect(scores).toEqual([80, 70, 60, 50]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("returns false for empty scores", () => expect(isReady(80, [], threshold)).toBe(false));

  it("returns true when overall >= threshold and all >= floor", () => {
    expect(isReady(80, [80, 75, 70], threshold)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    expect(isReady(79, [79, 70, 65], threshold)).toBe(false);
  });

  it("returns false when any dimension < DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 90, 64], threshold)).toBe(false);
  });

  it("returns true at exactly the threshold and floor", () => {
    expect(isReady(threshold, [threshold, DIMENSION_FLOOR, DIMENSION_FLOOR], threshold)).toBe(true);
  });

  it("one point below floor fails", () => {
    expect(isReady(85, [85, 90, DIMENSION_FLOOR - 1], threshold)).toBe(false);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web app",
    clarity: dim(70),
    conciseness: dim(80),
    dynamicCriteria: [dynCrit("define_audience", 75)],
    refinedPrompt: "Build something.",
  };

  it("computes overall as the mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((70 + 80 + 75) / 3));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.threshold).toBe(90);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment({
      ...base,
      clarity: dim(120),
      conciseness: dim(-10),
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("sets ready=true when threshold is crossed and floor is met", () => {
    const high: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...base,
      clarity: dim(85),
      conciseness: dim(82),
      dynamicCriteria: [dynCrit("define_audience", 80)],
    };
    expect(finalizeAssessment(high, 80).ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    const low: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...base,
      clarity: dim(50),
      conciseness: dim(60),
      dynamicCriteria: [dynCrit("define_audience", 55)],
    };
    expect(finalizeAssessment(low, 80).ready).toBe(false);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  it("returns empty for undefined/null input without prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("dedupes by key (keeps first occurrence)", () => {
    const items = [dynCrit("a", 70), dynCrit("a", 90), dynCrit("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = [dynCrit("a", 70), dynCrit("b", 60), dynCrit("c", 50), dynCrit("d", 40)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior spec order and fills from model output", () => {
    const prior = [spec("x"), spec("y"), spec("z")];
    const items = [dynCrit("z", 90), dynCrit("x", 70)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["x", "y", "z"]);
    expect(result[0].score).toBe(70);
    expect(result[2].score).toBe(90);
  });

  it("falls back gracefully when model omits a prior key", () => {
    const prior = [spec("a"), spec("b")];
    const items = [dynCrit("a", 80)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80);
    // "b" not in model output: falls back to deduped[1] which is undefined → score 0
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(0);
  });

  it("preserves prior key/label/bestPractice regardless of model output", () => {
    const prior = [{ key: "k", label: "Label", bestPractice: "bp" }];
    const items = [{ key: "k", label: "WRONG", bestPractice: "WRONG", score: 75, rationale: "", suggestion: "" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Label");
    expect(result[0].bestPractice).toBe("bp");
    expect(result[0].score).toBe(75);
  });
});
