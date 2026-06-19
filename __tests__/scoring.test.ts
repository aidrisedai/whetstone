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
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

const DIM = { rationale: "r", suggestion: "s" };
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  ...DIM,
});

describe("clamp", () => {
  it("clamps to 0–100 and rounds", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(72.6)).toBe(73);
    expect(clamp(NaN)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty list", () => expect(computeOverall([])).toBe(0));
  it("averages and rounds", () => expect(computeOverall([70, 80, 90])).toBe(80));
  it("rounds half-up", () => expect(computeOverall([75, 76])).toBe(76));
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 79], 80)).toBe(false);
  });
  it("returns false when any score is below the floor", () => {
    expect(isReady(85, [85, 60, 90], 80)).toBe(false);
  });
  it("returns true when overall meets threshold and all scores meet floor", () => {
    expect(isReady(80, [80, 70, 90], 80)).toBe(true);
  });
  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores clamped", () => {
    const a = {
      clarity: { score: 110, ...DIM },
      conciseness: { score: -5, ...DIM },
      dynamicCriteria: [dynDim("k1", 75)],
    };
    expect(dimensionScores(a)).toEqual([100, 0, 75]);
  });
});

describe("finalizeAssessment", () => {
  it("sets ready=true at threshold and sets threshold field", () => {
    const raw = {
      projectType: "Web app",
      clarity: { score: 85, ...DIM },
      conciseness: { score: 82, ...DIM },
      dynamicCriteria: [dynDim("define_audience", 80)],
      refinedPrompt: "Build a thing.",
    };
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(true);
    expect(a.threshold).toBe(80);
    expect(a.overall).toBe(82); // (85+82+80)/3 = 82.33 → 82
  });

  it("sets ready=false when one dimension is below floor", () => {
    const raw = {
      projectType: "App",
      clarity: { score: 90, ...DIM },
      conciseness: { score: 90, ...DIM },
      dynamicCriteria: [dynDim("k1", 60)], // 60 < DIMENSION_FLOOR (65)
      refinedPrompt: "x",
    };
    const a = finalizeAssessment(raw, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const raw = {
      projectType: "App",
      clarity: { score: -10, ...DIM },
      conciseness: { score: 200, ...DIM },
      dynamicCriteria: [],
      refinedPrompt: "x",
    };
    const a = finalizeAssessment(raw, 80);
    expect(a.clarity.score).toBe(0);
    expect(a.conciseness.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key and caps to 3 on first assessment", () => {
    const items: DynamicCriterion[] = [
      dynDim("a", 70),
      dynDim("b", 80),
      dynDim("c", 60),
      dynDim("a", 75), // duplicate key
      dynDim("d", 65),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b", "c"]); // cap 3, first 'a' wins
  });

  it("locks to prior specs when provided", () => {
    const prior: CriterionSpec[] = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
    ];
    const items: DynamicCriterion[] = [
      dynDim("success_criteria", 88),
      dynDim("define_audience", 72),
      dynDim("extra", 50), // not in prior, should not appear
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["define_audience", "success_criteria"]);
    expect(result[0].score).toBe(72);
    expect(result[1].score).toBe(88);
    expect(result[0].label).toBe("Audience"); // label locked to prior
  });

  it("handles undefined/empty items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
