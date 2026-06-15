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
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for negative values", () => expect(clamp(-1)).toBe(0));
  it("returns 100 for values above 100", () => expect(clamp(101)).toBe(100));
  it("rounds fractional values", () => expect(clamp(75.6)).toBe(76));
  it("passes through values within range", () => expect(clamp(50)).toBe(50));
  it("handles 0 and 100 boundaries", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
  // @ts-expect-error — test runtime safety against wrong input types
  it("returns 0 for non-numeric input", () => expect(clamp("bad")).toBe(0));
});

// ── dimensionScores ────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  const base = {
    clarity: { score: 70, rationale: "", suggestion: "" },
    conciseness: { score: 80, rationale: "", suggestion: "" },
  };

  it("extracts clarity and conciseness scores", () => {
    const scores = dimensionScores({ ...base, dynamicCriteria: [] });
    expect(scores).toEqual([70, 80]);
  });

  it("includes dynamic criteria scores", () => {
    const dyn: DynamicCriterion[] = [
      { key: "a", label: "A", bestPractice: "a", score: 60, rationale: "", suggestion: "" },
      { key: "b", label: "B", bestPractice: "b", score: 90, rationale: "", suggestion: "" },
    ];
    const scores = dimensionScores({ ...base, dynamicCriteria: dyn });
    expect(scores).toEqual([70, 80, 60, 90]);
  });

  it("clamps scores before returning them", () => {
    const scores = dimensionScores({
      clarity: { score: 110, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

// ── computeOverall ─────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for an empty array", () => expect(computeOverall([])).toBe(0));
  it("returns the single value for a one-item array", () => expect(computeOverall([75])).toBe(75));
  it("returns the mean of multiple scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the result", () => expect(computeOverall([33, 34])).toBe(34));
});

// ── isReady ────────────────────────────────────────────────────────────────

describe("isReady", () => {
  const threshold = 80;

  it("returns false when no scores are provided", () => {
    expect(isReady(90, [], threshold)).toBe(false);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79], threshold)).toBe(false);
  });

  it("returns false when any dimension is below the floor", () => {
    // Overall is 80, but one dimension is below DIMENSION_FLOOR (65).
    expect(isReady(80, [80, 64], threshold)).toBe(false);
  });

  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(80, [80, 80], threshold)).toBe(true);
  });

  it("returns true with a mix of high and floor-level dimensions", () => {
    expect(isReady(80, [95, DIMENSION_FLOOR, 70], threshold)).toBe(true);
  });

  it("returns false when one strong score can't carry a weak one past the floor", () => {
    // mean is fine, but min(99, 64) < 65
    expect(isReady(82, [99, 64], threshold)).toBe(false);
  });
});

// ── finalizeAssessment ─────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const raw = {
    projectType: "Web app",
    clarity: { score: 85, rationale: "good", suggestion: "tighten" },
    conciseness: { score: 75, rationale: "ok", suggestion: "cut" },
    dynamicCriteria: [] as DynamicCriterion[],
    refinedPrompt: "Build it.",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(80); // (85 + 75) / 2 = 80
  });

  it("stamps the active threshold onto the result", () => {
    const result = finalizeAssessment(raw, 75);
    expect(result.threshold).toBe(75);
  });

  it("marks ready when overall >= threshold and all dimensions clear the floor", () => {
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("marks not-ready when overall is below threshold", () => {
    const result = finalizeAssessment(raw, 81);
    expect(result.ready).toBe(false);
  });

  it("clamps scores from the raw model output", () => {
    const result = finalizeAssessment(
      { ...raw, clarity: { score: 120, rationale: "", suggestion: "" } },
      80,
    );
    expect(result.clarity.score).toBe(100);
  });
});

// ── normalizeDynamicCriteria ───────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const spec: CriterionSpec[] = [
    { key: "clarity", label: "Clarity", bestPractice: "be_clear_and_direct" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
  ];

  const items: DynamicCriterion[] = [
    { key: "clarity", label: "Clarity", bestPractice: "be_clear_and_direct", score: 70, rationale: "r", suggestion: "s" },
    { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope", score: 60, rationale: "r2", suggestion: "s2" },
  ];

  it("deduplicates by key when no prior criteria are set", () => {
    const duped = [...items, ...items];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("clarity");
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const many: DynamicCriterion[] = Array.from({ length: 5 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
      bestPractice: `bp${i}`,
      score: 50,
      rationale: "",
      suggestion: "",
    }));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks order and identity to the prior spec", () => {
    const result = normalizeDynamicCriteria(items, spec);
    expect(result[0].key).toBe("clarity");
    expect(result[1].key).toBe("scope");
    expect(result[0].label).toBe("Clarity");
  });

  it("takes the latest score/rationale/suggestion for each locked dimension", () => {
    const updated: DynamicCriterion[] = [
      { ...items[0], score: 88, rationale: "updated" },
      { ...items[1], score: 72 },
    ];
    const result = normalizeDynamicCriteria(updated, spec);
    expect(result[0].score).toBe(88);
    expect(result[0].rationale).toBe("updated");
    expect(result[1].score).toBe(72);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
