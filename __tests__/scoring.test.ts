import { describe, it, expect } from "vitest";
import {
  clamp,
  dimensionScores,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

// ── clamp ──────────────────────────────────────────────────────────────────
describe("clamp", () => {
  it("rounds and clamps to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
    expect(clamp(0)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(72.6)).toBe(73);
  });

  it("returns 0 for non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

// ── dimensionScores ────────────────────────────────────────────────────────
describe("dimensionScores", () => {
  it("returns clarity + conciseness + dynamic scores in order", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "a", score: 90, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([80, 70, 90]);
  });

  it("clamps out-of-range scores", () => {
    const result = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────
describe("computeOverall", () => {
  it("returns the rounded mean", () => {
    expect(computeOverall([80, 70, 90])).toBe(80);
    expect(computeOverall([0, 100])).toBe(50);
    expect(computeOverall([33, 34, 33])).toBe(33);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

// ── isReady ────────────────────────────────────────────────────────────────
describe("isReady", () => {
  it("returns true when overall meets threshold and no dimension is below floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(90, [90, 70, 80], 80)).toBe(true); // floor is 65, 70 ok
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79, 79], 80)).toBe(false);
  });

  it("returns false when any dimension is below the floor", () => {
    // DIMENSION_FLOOR is 65; a score of 60 should fail
    expect(isReady(90, [90, 90, 60], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("uses the supplied threshold, not a hard-coded constant", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 71)).toBe(false);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────
describe("finalizeAssessment", () => {
  const base = {
    projectType: "Game",
    clarity: { score: 82, rationale: "r", suggestion: "s" },
    conciseness: { score: 78, rationale: "r", suggestion: "s" },
    dynamicCriteria: [
      { key: "k", label: "L", bestPractice: "b", score: 74, rationale: "r", suggestion: "s" },
    ],
    refinedPrompt: "Build a game.",
  };

  it("computes overall as the rounded mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((82 + 78 + 74) / 3));
  });

  it("stamps the active threshold", () => {
    expect(finalizeAssessment(base, 75).threshold).toBe(75);
  });

  it("sets ready=true when all conditions are met", () => {
    const high = {
      ...base,
      clarity: { ...base.clarity, score: 90 },
      conciseness: { ...base.conciseness, score: 88 },
      dynamicCriteria: [{ ...base.dynamicCriteria[0], score: 85 }],
    };
    expect(finalizeAssessment(high, 80).ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    expect(finalizeAssessment(base, 90).ready).toBe(false);
  });

  it("clamps out-of-range dimension scores", () => {
    const raw = {
      ...base,
      clarity: { ...base.clarity, score: 200 },
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────
describe("normalizeDynamicCriteria", () => {
  const specs: CriterionSpec[] = [
    { key: "a", label: "A", bestPractice: "a" },
    { key: "b", label: "B", bestPractice: "b" },
  ];

  it("deduplicates by key on the first call (no prior)", () => {
    const items: DynamicCriterion[] = [
      { key: "x", label: "X", bestPractice: "x", score: 70, rationale: "r", suggestion: "s" },
      { key: "x", label: "X2", bestPractice: "x", score: 80, rationale: "r2", suggestion: "s2" },
      { key: "y", label: "Y", bestPractice: "y", score: 60, rationale: "r", suggestion: "s" },
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[1].key).toBe("y");
  });

  it("caps first-call results to 3", () => {
    const items: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: `b${i}`,
      score: 50,
      rationale: "",
      suggestion: "",
    }));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior specs when supplied, preserving order and labels", () => {
    const items: DynamicCriterion[] = [
      { key: "b", label: "B-new", bestPractice: "b", score: 88, rationale: "rb", suggestion: "sb" },
      { key: "a", label: "A-new", bestPractice: "a", score: 77, rationale: "ra", suggestion: "sa" },
    ];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].label).toBe("A"); // locked to prior label
    expect(result[0].score).toBe(77);
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(88);
  });

  it("falls back to index-matched item when key is missing from incoming data", () => {
    const items: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "a", score: 55, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, specs);
    // spec[1] is "b" but "b" isn't in items; it should fall back to deduped[1] (undefined → score 0)
    expect(result[1].score).toBe(0);
    expect(result[1].key).toBe("b"); // keeps prior key
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as unknown as undefined, null)).toEqual([]);
  });

  it("clamps scores when locking to prior", () => {
    const items: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "a", score: 999, rationale: "", suggestion: "" },
      { key: "b", label: "B", bestPractice: "b", score: -50, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, specs);
    expect(result[0].score).toBe(100);
    expect(result[1].score).toBe(0);
  });
});

// ── DIMENSION_FLOOR constant ───────────────────────────────────────────────
describe("DIMENSION_FLOOR", () => {
  it("is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
