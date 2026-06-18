import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
  finalizeAssessment,
  normalizeDynamicCriteria,
  dimensionScores,
} from "../scoring";
import type { Assessment, DynamicCriterion } from "../types";

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------
describe("clamp", () => {
  it("keeps values in [0, 100]", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps negative values to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-numbers", () => {
    expect(clamp("foo" as unknown as number)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeOverall
// ---------------------------------------------------------------------------
describe("computeOverall", () => {
  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the value for a single-element array", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("returns the rounded mean", () => {
    expect(computeOverall([70, 80])).toBe(75);
    expect(computeOverall([70, 80, 90])).toBe(80);
  });

  it("rounds correctly for non-integer means", () => {
    // (70 + 71) / 2 = 70.5 → rounds to 71
    expect(computeOverall([70, 71])).toBe(71);
  });
});

// ---------------------------------------------------------------------------
// isReady
// ---------------------------------------------------------------------------
describe("isReady", () => {
  it("returns true when overall meets threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(90, [70, 80, 90], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 79], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    const belowFloor = DIMENSION_FLOOR - 1;
    expect(isReady(80, [80, 80, belowFloor], 80)).toBe(false);
  });

  it("returns false for an empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 75)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// finalizeAssessment
// ---------------------------------------------------------------------------
const makeDynamic = (score: number): DynamicCriterion => ({
  key: "d1",
  label: "Detail",
  bestPractice: "Be specific",
  score,
  rationale: "ok",
  suggestion: "more detail",
});

const makeRaw = (
  clarityScore: number,
  concisenessScore: number,
  dynamicScore: number,
): Omit<Assessment, "overall" | "ready" | "threshold"> => ({
  projectType: "app",
  clarity: { score: clarityScore, rationale: "r", suggestion: "s" },
  conciseness: { score: concisenessScore, rationale: "r", suggestion: "s" },
  dynamicCriteria: [makeDynamic(dynamicScore)],
  refinedPrompt: "Build something.",
});

describe("finalizeAssessment", () => {
  it("clamps scores and computes overall deterministically", () => {
    const result = finalizeAssessment(makeRaw(80, 80, 80));
    expect(result.overall).toBe(80);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("sets ready=true when scores pass the gate", () => {
    const result = finalizeAssessment(makeRaw(80, 80, 80));
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const result = finalizeAssessment(makeRaw(60, 60, 60));
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range raw scores", () => {
    const result = finalizeAssessment(makeRaw(150, -10, 80));
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });

  it("uses custom threshold", () => {
    const result = finalizeAssessment(makeRaw(70, 70, 70), 70);
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(70);
  });
});

// ---------------------------------------------------------------------------
// dimensionScores
// ---------------------------------------------------------------------------
describe("dimensionScores", () => {
  it("includes clarity, conciseness, and all dynamic criteria", () => {
    const a = makeRaw(70, 80, 90) as Assessment;
    const scores = dimensionScores(a);
    expect(scores).toEqual([70, 80, 90]);
  });

  it("clamps all returned scores", () => {
    const a = {
      clarity: { score: 150, rationale: "", suggestion: "" },
      conciseness: { score: -5, rationale: "", suggestion: "" },
      dynamicCriteria: [makeDynamic(200)],
    };
    const scores = dimensionScores(a);
    expect(scores).toEqual([100, 0, 100]);
  });
});

// ---------------------------------------------------------------------------
// normalizeDynamicCriteria
// ---------------------------------------------------------------------------
describe("normalizeDynamicCriteria", () => {
  const item = (key: string, score: number): DynamicCriterion => ({
    key,
    label: `Label ${key}`,
    bestPractice: "bp",
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("deduplicates by key (first occurrence wins)", () => {
    const items = [item("a", 70), item("a", 80), item("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70);
  });

  it("caps to 3 items on first assessment (no prior)", () => {
    const items = [item("a", 70), item("b", 80), item("c", 90), item("d", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior spec order and keys when prior is set", () => {
    const prior = [
      { key: "b", label: "B label", bestPractice: "bp-b" },
      { key: "a", label: "A label", bestPractice: "bp-a" },
    ];
    const items = [item("a", 75), item("b", 85)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(85);
    expect(result[1].score).toBe(75);
    expect(result[0].label).toBe("B label");
  });

  it("handles undefined/null gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("filters out invalid items", () => {
    const items = [null, undefined, { score: 50 }, item("a", 70)] as unknown as DynamicCriterion[];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.every((r) => typeof r.key === "string")).toBe(true);
  });
});
