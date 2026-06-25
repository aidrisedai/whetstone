import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

// ── clamp ──────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("rounds and bounds to [0, 100]", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.6)).toBe(51);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("oops" as unknown as number)).toBe(0);
  });
});

// ── computeOverall ────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns the rounded mean", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([80, 81])).toBe(81); // Math.round(80.5) = 81
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("handles single score", () => {
    expect(computeOverall([73])).toBe(73);
  });
});

// ── isReady ───────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(85, [85, 80, 70], threshold)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [85, 90, 80], threshold)).toBe(false);
  });

  it("returns false when a dimension is below the floor (65)", () => {
    expect(isReady(85, [85, 90, 64], threshold)).toBe(false);
  });

  it("returns false with empty scores", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });

  it("exactly at threshold and floor is ready", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, DIMENSION_FLOOR], threshold)).toBe(true);
  });

  it("just below floor fails", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR - 1, 90], threshold)).toBe(false);
  });
});

// ── finalizeAssessment ────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base = {
    clarity: { score: 82, rationale: "r", suggestion: "s" },
    conciseness: { score: 78, rationale: "r", suggestion: "s" },
    dynamicCriteria: [
      { key: "k1", label: "K1", bestPractice: "bp1", score: 90, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "Do X for Y",
    projectType: "Web app",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((82 + 78 + 90) / 3));
  });

  it("stamps the threshold and ready flag", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.threshold).toBe(80);
    // overall ~83, min score 78 which is >= floor (65) → ready
    expect(result.ready).toBe(true);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment(
      {
        ...base,
        clarity: { ...base.clarity, score: 150 },
        conciseness: { ...base.conciseness, score: -5 },
      },
      80,
    );
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when no threshold argument is given", () => {
    const result = finalizeAssessment(base);
    expect(result.threshold).toBe(80); // matches DEFAULT_THRESHOLD env default
  });
});

// ── normalizeDynamicCriteria ─────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    { key: "a", label: "A", bestPractice: "bpA", score: 70, rationale: "r", suggestion: "s" },
    { key: "b", label: "B", bestPractice: "bpB", score: 80, rationale: "r", suggestion: "s" },
    { key: "a", label: "A-dup", bestPractice: "bpA", score: 99, rationale: "r2", suggestion: "s2" },
  ];

  it("deduplicates by key (first occurrence wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result.find((d) => d.key === "a")?.score).toBe(70);
  });

  it("caps to 3 items on the first assessment (no prior)", () => {
    const many: DynamicCriterion[] = Array.from({ length: 6 }, (_, i) => ({
      key: `k${i}`,
      label: `K${i}`,
      bestPractice: "bp",
      score: 50,
      rationale: "r",
      suggestion: "s",
    }));
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior spec order when prior exists", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bpB" },
      { key: "a", label: "A", bestPractice: "bpA" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["b", "a"]);
  });

  it("handles undefined/null gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("clamped scores in normalized output", () => {
    const bad: DynamicCriterion[] = [
      { key: "x", label: "X", bestPractice: "bp", score: 200, rationale: "r", suggestion: "s" },
    ];
    // normalizeD does not clamp — finalizeAssessment does; but just confirm no crash
    const result = normalizeDynamicCriteria(bad, null);
    expect(result[0].score).toBe(200);
  });
});
