import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

// ─── clamp ────────────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("passes values in 0–100 through unchanged", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps values below 0 to 0", () => {
    expect(clamp(-10)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(150)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number", () => {
    // @ts-expect-error deliberate wrong type
    expect(clamp("hello")).toBe(0);
  });
});

// ─── computeOverall ───────────────────────────────────────────────────────────

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the value when there is one score", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("averages multiple scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 61])).toBe(71); // 141/2 = 70.5 → 71
  });
});

// ─── dimensionScores ──────────────────────────────────────────────────────────

describe("dimensionScores", () => {
  it("returns clarity, conciseness, and dynamic scores in order", () => {
    const result = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k1", label: "L1", bestPractice: "", score: 90, rationale: "", suggestion: "" },
        { key: "k2", label: "L2", bestPractice: "", score: 60, rationale: "", suggestion: "" },
      ],
    });
    expect(result).toEqual([80, 70, 90, 60]);
  });

  it("clamps out-of-range scores", () => {
    const result = dimensionScores({
      clarity: { score: 120, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

// ─── isReady ─────────────────────────────────────────────────────────────────

describe("isReady", () => {
  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79], 80)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    const scores = [85, 64, 90]; // 64 < 65
    expect(isReady(80, scores, 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all dimensions meet floor", () => {
    const scores = [80, 70, 90];
    expect(isReady(80, scores, 80)).toBe(true);
  });

  it("uses the passed threshold (not hardcoded)", () => {
    const scores = [75, 70];
    expect(isReady(73, scores, 70)).toBe(true);
    expect(isReady(73, scores, 80)).toBe(false);
  });
});

// ─── finalizeAssessment ───────────────────────────────────────────────────────

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web App",
    clarity: { score: 85, rationale: "clear", suggestion: "" },
    conciseness: { score: 75, rationale: "concise", suggestion: "" },
    dynamicCriteria: [
      { key: "impact", label: "Impact", bestPractice: "...", score: 90, rationale: "", suggestion: "" },
    ] as DynamicCriterion[],
    refinedPrompt: "build a thing",
  };

  it("computes overall as mean of all dimension scores", () => {
    const result = finalizeAssessment(base, 80);
    // (85 + 75 + 90) / 3 = 83.33 → 83
    expect(result.overall).toBe(83);
  });

  it("stamps threshold on the result", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.threshold).toBe(80);
  });

  it("sets ready=true when conditions are met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const lowBase = {
      ...base,
      clarity: { score: 60, rationale: "", suggestion: "" },
      conciseness: { score: 50, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "impact", label: "Impact", bestPractice: "", score: 55, rationale: "", suggestion: "" },
      ] as DynamicCriterion[],
    };
    const result = finalizeAssessment(lowBase, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range raw scores before computing", () => {
    const overBase = {
      ...base,
      clarity: { score: 150, rationale: "", suggestion: "" } as { score: number; rationale: string; suggestion: string },
    };
    const result = finalizeAssessment(overBase, 80);
    expect(result.clarity.score).toBe(100);
  });
});

// ─── normalizeDynamicCriteria ─────────────────────────────────────────────────

describe("normalizeDynamicCriteria", () => {
  const makeCriteria = (keys: string[]): DynamicCriterion[] =>
    keys.map((key) => ({
      key,
      label: `Label ${key}`,
      bestPractice: `BP ${key}`,
      score: 70,
      rationale: "ok",
      suggestion: "improve",
    }));

  it("deduplicates by key", () => {
    const items = [...makeCriteria(["a", "b"]), ...makeCriteria(["a"])];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("caps to 3 on the first assessment (no prior)", () => {
    const items = makeCriteria(["a", "b", "c", "d"]);
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("returns empty array when items is undefined and no prior", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("locks to prior specs and pulls updated scores", () => {
    const prior: CriterionSpec[] = [
      { key: "impact", label: "Impact", bestPractice: "..." },
      { key: "feasibility", label: "Feasibility", bestPractice: "..." },
    ];
    const items = makeCriteria(["impact", "feasibility"]);
    items[0].score = 88;
    items[1].score = 77;
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("impact");
    expect(result[0].label).toBe("Impact"); // from prior, not model output
    expect(result[0].score).toBe(88);
    expect(result[1].score).toBe(77);
  });

  it("falls back to positional match when a prior key is missing from model output", () => {
    const prior: CriterionSpec[] = [
      { key: "impact", label: "Impact", bestPractice: "..." },
    ];
    // Model returns a different key
    const items = makeCriteria(["creativity"]);
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("impact"); // locked to prior
    expect(result[0].score).toBe(70);  // from positional fallback
  });
});

// ─── constants ────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });

  it("DEFAULT_THRESHOLD falls back to 80 when env var is unset", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});
