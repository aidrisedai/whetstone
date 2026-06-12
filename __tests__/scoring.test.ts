import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

const makeAssessmentBase = (
  clarityScore: number,
  concisenessScore: number,
  dynamics: DynamicCriterion[] = [],
) => ({
  projectType: "app",
  clarity: { score: clarityScore, rationale: "r", suggestion: "s" },
  conciseness: { score: concisenessScore, rationale: "r", suggestion: "s" },
  dynamicCriteria: dynamics,
  refinedPrompt: "build it",
});

describe("clamp", () => {
  it("clamps values to 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.6)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-numbers", () => {
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages scores correctly", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the mean", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 rounds to 81
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores pass floor", () => {
    expect(isReady(85, [85, 90, 70], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(75, [90, 80, 70], 80)).toBe(false);
  });

  it("returns false when any dimension is below DIMENSION_FLOOR", () => {
    expect(isReady(85, [85, 90, 60], 80)).toBe(false);
    expect(60 < DIMENSION_FLOOR).toBe(true);
  });

  it("returns false for empty scores", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("uses exact threshold boundary", () => {
    expect(isReady(80, [80, 80], 80)).toBe(true);
    expect(isReady(79, [80, 80], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [makeDynamic("originality", 90)],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  it("computes overall from all dimensions", () => {
    const result = finalizeAssessment(makeAssessmentBase(80, 80, [makeDynamic("x", 80)]), 80);
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when above threshold with all dimensions above floor", () => {
    const result = finalizeAssessment(makeAssessmentBase(85, 90, [makeDynamic("x", 85)]), 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    const result = finalizeAssessment(makeAssessmentBase(60, 70, [makeDynamic("x", 65)]), 80);
    expect(result.ready).toBe(false);
  });

  it("clamps raw scores from the model", () => {
    const result = finalizeAssessment(makeAssessmentBase(150, -10, [makeDynamic("x", 200)]), 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.dynamicCriteria[0].score).toBe(100);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(makeAssessmentBase(80, 80), 75);
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first assessment (no prior)", () => {
    const items: DynamicCriterion[] = [
      makeDynamic("originality", 80),
      makeDynamic("originality", 90), // duplicate key
      makeDynamic("feasibility", 70),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("originality");
    expect(result[1].key).toBe("feasibility");
  });

  it("caps to 3 items on first assessment", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 80));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior keys when prior is set", () => {
    const prior: CriterionSpec[] = [
      { key: "originality", label: "Originality", bestPractice: "bp1" },
      { key: "feasibility", label: "Feasibility", bestPractice: "bp2" },
    ];
    const items: DynamicCriterion[] = [
      makeDynamic("originality", 85),
      makeDynamic("feasibility", 75),
      makeDynamic("extra", 90), // ignored — not in prior
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("originality");
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("feasibility");
    expect(result[1].label).toBe("Feasibility"); // locked from prior, not model output
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
