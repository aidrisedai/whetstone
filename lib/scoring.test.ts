import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

describe("clamp", () => {
  it("clamps numbers to 0–100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(99.6)).toBe(100);
    expect(clamp(99.4)).toBe(99);
  });
  it("returns 0 for non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 60, 70])).toBe(70);
    expect(computeOverall([100, 0])).toBe(50);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("rounds to nearest integer", () => {
    expect(computeOverall([67, 68])).toBe(68); // 67.5 → 68
  });
});

describe("isReady", () => {
  it("requires overall >= threshold AND all scores >= floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
    expect(isReady(80, [80, 64, 75], 80)).toBe(false); // one dimension below floor (65)
    expect(isReady(80, [80, 65, 75], 80)).toBe(true); // exactly at floor
  });
  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("extracts and clamps scores from an assessment shape", () => {
    const a = {
      clarity: { score: 75, rationale: "", suggestion: "" },
      conciseness: { score: 85, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "k", label: "l", bestPractice: "bp", score: 70, rationale: "", suggestion: "" },
      ] as DynamicCriterion[],
    };
    expect(dimensionScores(a)).toEqual([75, 85, 70]);
  });
  it("clamps out-of-range scores", () => {
    const a = {
      clarity: { score: -5, rationale: "", suggestion: "" },
      conciseness: { score: 120, rationale: "", suggestion: "" },
      dynamicCriteria: [] as DynamicCriterion[],
    };
    expect(dimensionScores(a)).toEqual([0, 100]);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "Web app",
    clarity: { score: 80, rationale: "r", suggestion: "s" },
    conciseness: { score: 70, rationale: "r", suggestion: "s" },
    dynamicCriteria: [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience", score: 75, rationale: "r", suggestion: "s" },
    ] as DynamicCriterion[],
    refinedPrompt: "Build a thing.",
  };

  it("computes overall as mean", () => {
    const a = finalizeAssessment(base);
    expect(a.overall).toBe(Math.round((80 + 70 + 75) / 3));
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(base, 75);
    expect(a.threshold).toBe(75);
  });

  it("sets ready=true when overall >= threshold and all scores >= floor", () => {
    const high = {
      ...base,
      clarity: { ...base.clarity, score: 90 },
      conciseness: { ...base.conciseness, score: 85 },
      dynamicCriteria: [{ ...base.dynamicCriteria[0], score: 85 }],
    };
    const a = finalizeAssessment(high, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const a = finalizeAssessment(base, 90);
    expect(a.ready).toBe(false);
  });

  it("sets ready=false when one dimension is below the floor", () => {
    const low = {
      ...base,
      clarity: { ...base.clarity, score: 90 },
      conciseness: { ...base.conciseness, score: 60 }, // below DIMENSION_FLOOR (65)
      dynamicCriteria: [{ ...base.dynamicCriteria[0], score: 90 }],
    };
    const a = finalizeAssessment(low, 70);
    expect(a.ready).toBe(false);
  });

  it("uses DEFAULT_THRESHOLD when none is passed", () => {
    const a = finalizeAssessment(base);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const item1: DynamicCriterion = { key: "k1", label: "L1", bestPractice: "bp1", score: 70, rationale: "r", suggestion: "s" };
  const item2: DynamicCriterion = { key: "k2", label: "L2", bestPractice: "bp2", score: 60, rationale: "r", suggestion: "s" };
  const spec1: CriterionSpec = { key: "k1", label: "L1", bestPractice: "bp1" };
  const spec2: CriterionSpec = { key: "k2", label: "L2", bestPractice: "bp2" };

  it("deduplicates by key on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria([item1, item1, item2], null);
    expect(result.map((r) => r.key)).toEqual(["k1", "k2"]);
  });

  it("caps to 3 on first assessment", () => {
    const items = ["a", "b", "c", "d"].map(
      (k): DynamicCriterion => ({ key: k, label: k, bestPractice: k, score: 50, rationale: "", suggestion: "" }),
    );
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior spec order and preserves label/bestPractice from prior", () => {
    const result = normalizeDynamicCriteria([item2, item1], [spec1, spec2]);
    expect(result[0].key).toBe("k1");
    expect(result[0].label).toBe("L1");
    expect(result[1].key).toBe("k2");
  });

  it("returns 0-scored placeholder when prior key is missing from model response", () => {
    const result = normalizeDynamicCriteria([], [spec1]);
    expect(result[0].score).toBe(0);
    expect(result[0].key).toBe("k1");
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as unknown as undefined, null)).toEqual([]);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
