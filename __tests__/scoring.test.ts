import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

describe("clamp", () => {
  it("returns value as-is when already in [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps values below 0 to 0", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(-1)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(72.4)).toBe(72);
    expect(clamp(72.5)).toBe(73);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number types", () => {
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the single value for a one-element array", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("returns the rounded mean", () => {
    expect(computeOverall([70, 80])).toBe(75);
    expect(computeOverall([70, 71, 72])).toBe(71);
  });

  it("rounds the mean", () => {
    expect(computeOverall([70, 71])).toBe(71); // 70.5 → 71
  });
});

describe("isReady", () => {
  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores meet floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    const justBelowFloor = DIMENSION_FLOOR - 1;
    expect(isReady(85, [90, justBelowFloor, 90], 80)).toBe(false);
  });

  it("returns true when all scores exactly equal the floor", () => {
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });

  it("honours a custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 75)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("returns clamped scores for clarity, conciseness, and dynamic criteria", () => {
    const assessment = {
      clarity: { score: 80, rationale: "", suggestion: "" },
      conciseness: { score: 75, rationale: "", suggestion: "" },
      dynamicCriteria: [
        { key: "a", label: "A", bestPractice: "", score: 120, rationale: "", suggestion: "" },
        { key: "b", label: "B", bestPractice: "", score: -5, rationale: "", suggestion: "" },
      ],
    };
    expect(dimensionScores(assessment)).toEqual([80, 75, 100, 0]);
  });

  it("returns just two scores when there are no dynamic criteria", () => {
    const assessment = {
      clarity: { score: 60, rationale: "", suggestion: "" },
      conciseness: { score: 70, rationale: "", suggestion: "" },
      dynamicCriteria: [],
    };
    expect(dimensionScores(assessment)).toEqual([60, 70]);
  });
});

describe("finalizeAssessment", () => {
  const makeRaw = (clarityScore: number, concisenessScore: number, dynamic: DynamicCriterion[]) => ({
    clarity: { score: clarityScore, rationale: "r", suggestion: "s" },
    conciseness: { score: concisenessScore, rationale: "r", suggestion: "s" },
    dynamicCriteria: dynamic,
    criteriaUsed: [] as CriterionSpec[],
    summary: "test summary",
  });

  it("clamps all scores, computes the overall mean, and stamps the threshold", () => {
    const result = finalizeAssessment(makeRaw(90, 80, [
      { key: "x", label: "X", bestPractice: "", score: 70, rationale: "", suggestion: "" },
    ]), 80);
    expect(result.clarity.score).toBe(90);
    expect(result.conciseness.score).toBe(80);
    expect(result.dynamicCriteria[0].score).toBe(70);
    expect(result.overall).toBe(80); // (90 + 80 + 70) / 3 = 80
    expect(result.threshold).toBe(80);
  });

  it("sets ready=true when overall meets threshold and all scores clear the floor", () => {
    const result = finalizeAssessment(makeRaw(85, 80, [
      { key: "x", label: "X", bestPractice: "", score: 75, rationale: "", suggestion: "" },
    ]), 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when one dimension is below the floor", () => {
    const result = finalizeAssessment(makeRaw(95, 95, [
      { key: "x", label: "X", bestPractice: "", score: 60, rationale: "", suggestion: "" }, // below DIMENSION_FLOOR=65
    ]), 80);
    expect(result.ready).toBe(false);
  });

  it("uses DEFAULT_THRESHOLD when none is provided", () => {
    const result = finalizeAssessment(makeRaw(90, 90, []));
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps out-of-range scores from the model", () => {
    const result = finalizeAssessment(makeRaw(150, -20, []), 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeCriterion = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key.toUpperCase(),
    bestPractice: "bp",
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("returns up to 3 criteria on first assessment (no prior)", () => {
    const items = [makeCriterion("a", 70), makeCriterion("b", 80), makeCriterion("c", 90), makeCriterion("d", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.key)).toEqual(["a", "b", "c"]);
  });

  it("deduplicates criteria with the same key", () => {
    const items = [makeCriterion("a", 70), makeCriterion("a", 90), makeCriterion("b", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("locks to prior specs on subsequent assessments", () => {
    const prior: CriterionSpec[] = [
      { key: "x", label: "X", bestPractice: "bpx" },
      { key: "y", label: "Y", bestPractice: "bpy" },
    ];
    const items = [makeCriterion("x", 88), makeCriterion("y", 77)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("x");
    expect(result[0].score).toBe(88);
    expect(result[1].key).toBe("y");
    expect(result[1].score).toBe(77);
    // label and bestPractice come from the prior spec, not the model
    expect(result[0].label).toBe("X");
  });

  it("clamps out-of-range scores when locking to prior specs", () => {
    const prior: CriterionSpec[] = [{ key: "a", label: "A", bestPractice: "bp" }];
    const items = [makeCriterion("a", 150)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].score).toBe(100);
  });

  it("returns raw (unclamped) scores on first assessment (no prior)", () => {
    // Clamping is deferred to finalizeAssessment; normalizeDynamicCriteria
    // does not clamp when prior is null.
    const items = [makeCriterion("a", 150)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result[0].score).toBe(150);
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("ignores items without a string key", () => {
    const items = [{ key: 123, label: "bad", score: 50 } as unknown as DynamicCriterion, makeCriterion("ok", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["ok"]);
  });
});
