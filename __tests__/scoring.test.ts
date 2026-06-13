import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "@/lib/types";

const dim = (score: number) => ({
  score,
  rationale: "test rationale",
  suggestion: "test suggestion",
});

const dynCrit = (key: string, score: number): DynamicCriterion => ({
  key,
  label: `Label ${key}`,
  bestPractice: `bp_${key}`,
  ...dim(score),
});

describe("clamp", () => {
  it("clamps values to [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(150)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns the mean of all scores", () => {
    expect(computeOverall([80, 60, 100])).toBe(80);
    expect(computeOverall([70, 90])).toBe(80);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 rounds to 81
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, 90], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 90], 80)).toBe(false);
  });

  it("returns false when any score is below the floor", () => {
    expect(isReady(85, [85, 64, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70], 75)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria scores", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(90),
      dynamicCriteria: [dynCrit("a", 70)],
    });
    expect(scores).toEqual([80, 90, 70]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: dim(200),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "App",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynCrit("targetAudience", 80)],
    refinedPrompt: "A sharper version of the idea.",
  };

  it("computes correct overall from all dimensions", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.overall).toBe(80); // mean(85, 75, 80)
  });

  it("sets ready=true when threshold and floor are cleared", () => {
    const result = finalizeAssessment(baseRaw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    const result = finalizeAssessment(
      { ...baseRaw, clarity: dim(60), conciseness: dim(60), dynamicCriteria: [dynCrit("a", 60)] },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("stamps the active threshold", () => {
    expect(finalizeAssessment(baseRaw, 75).threshold).toBe(75);
    expect(finalizeAssessment(baseRaw, 90).threshold).toBe(90);
  });

  it("clamps out-of-range scores from the model", () => {
    const result = finalizeAssessment({ ...baseRaw, clarity: dim(999), conciseness: dim(-50) }, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates items by key", () => {
    const items: DynamicCriterion[] = [dynCrit("a", 80), dynCrit("a", 90), dynCrit("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first occurrence wins
  });

  it("caps to 3 on first assessment (no prior)", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynCrit(k, 80));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior keys when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "X", bestPractice: "bp_x" },
      { key: "y", label: "Y", bestPractice: "bp_y" },
    ];
    // "x" matches prior[0]; "z" doesn't match prior[1] but is used as index fallback
    const items: DynamicCriterion[] = [dynCrit("x", 85), dynCrit("z", 90)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(85);
    // prior[1].key="y" not in byKey, so falls back to deduped[1]="z" for score
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(90);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters items missing a key", () => {
    const items = [{ score: 80, rationale: "", suggestion: "" }] as unknown as DynamicCriterion[];
    expect(normalizeDynamicCriteria(items, null)).toEqual([]);
  });
});
