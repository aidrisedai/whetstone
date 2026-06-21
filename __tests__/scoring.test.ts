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

// ── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes through in-range values", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps values below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds to the nearest integer", () => {
    expect(clamp(72.4)).toBe(72);
    expect(clamp(72.6)).toBe(73);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-numbers", () => {
    expect(clamp("oops" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the sole value for a single-element array", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("computes the mean of multiple scores", () => {
    expect(computeOverall([80, 60, 70])).toBe(70);
  });

  it("rounds the mean", () => {
    // (80 + 61) / 2 = 70.5 → rounds to 71
    expect(computeOverall([80, 61])).toBe(71);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = DEFAULT_THRESHOLD; // 80

  it("returns false when scores is empty", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 70, 75], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], threshold)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [90, DIMENSION_FLOOR - 1, 85], threshold)).toBe(false);
  });

  it("passes when every dimension is exactly at DIMENSION_FLOOR", () => {
    expect(isReady(threshold, [threshold, DIMENSION_FLOOR, DIMENSION_FLOOR], threshold)).toBe(true);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Game",
    clarity: { score: 80, rationale: "clear", suggestion: "keep going" },
    conciseness: { score: 90, rationale: "tight", suggestion: "good" },
    dynamicCriteria: [
      { key: "core_mechanic", label: "Core mechanic", bestPractice: "core_mechanic", score: 85, rationale: "solid", suggestion: "go" },
    ],
    refinedPrompt: "Build a game",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const a = finalizeAssessment(base);
    // overall = round((80 + 90 + 85) / 3) = round(85) = 85
    expect(a.overall).toBe(85);
  });

  it("sets ready=true when above threshold and all dimensions clear the floor", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall is below the custom threshold", () => {
    const a = finalizeAssessment(base, 90);
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range raw scores", () => {
    const a = finalizeAssessment({
      ...base,
      clarity: { ...base.clarity, score: 999 },
      conciseness: { ...base.conciseness, score: -5 },
    });
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("stamps the threshold onto the returned assessment", () => {
    const a = finalizeAssessment(base, 75);
    expect(a.threshold).toBe(75);
  });
});

// ── normalizeDynamicCriteria ──────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key,
    bestPractice: key,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("returns up to 3 items when there are no prior criteria", () => {
    const items = [makeItem("a", 70), makeItem("b", 75), makeItem("c", 80), makeItem("d", 85)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates items by key", () => {
    const items = [makeItem("a", 70), makeItem("a", 80), makeItem("b", 75)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("locks to prior criteria order when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "b" },
      { key: "a", label: "A", bestPractice: "a" },
    ];
    const items = [makeItem("a", 70), makeItem("b", 80)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(80);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(70);
  });

  it("preserves prior labels and bestPractice when locking", () => {
    const prior: CriterionSpec[] = [{ key: "x", label: "Original label", bestPractice: "orig" }];
    const items = [{ ...makeItem("x", 77), label: "Model label", bestPractice: "model-bp" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Original label");
    expect(result[0].bestPractice).toBe("orig");
    expect(result[0].score).toBe(77); // score from the model, clamped
  });

  it("handles undefined/null items gracefully", () => {
    const items = [null, undefined, makeItem("a", 70)] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
  });

  it("returns empty array for undefined input", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toHaveLength(0);
  });
});
