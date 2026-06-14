import { describe, it, expect, beforeEach } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "@/lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("returns value unchanged within 0-100", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below 0 to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-999)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds decimals", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
    expect(clamp(99.9)).toBe(100);
  });

  it("returns 0 for NaN", () => {
    expect(clamp(NaN)).toBe(0);
  });

  it("returns 0 for non-number inputs", () => {
    expect(clamp("50" as unknown as number)).toBe(0);
    expect(clamp(null as unknown as number)).toBe(0);
    expect(clamp(undefined as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("returns the value for a single-element array", () => {
    expect(computeOverall([75])).toBe(75);
  });

  it("returns the rounded mean", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([80, 60, 70])).toBe(70);
  });

  it("rounds half-up correctly", () => {
    // (80 + 81) / 2 = 80.5 → rounds to 81
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("isReady", () => {
  it("returns false when scores array is empty", () => {
    expect(isReady(90, [], 80)).toBe(false);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80], 80)).toBe(false);
  });

  it("returns false when any score is below the floor", () => {
    expect(isReady(85, [85, 64], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(80, [80, 70], 80)).toBe(true);
    expect(isReady(80, [DIMENSION_FLOOR, DIMENSION_FLOOR], 80)).toBe(true);
  });

  it("returns false when both threshold and floor are not met", () => {
    expect(isReady(70, [60, 50], 80)).toBe(false);
  });

  it("passes with overall exactly at threshold and all scores at floor", () => {
    expect(isReady(80, [65, 65, 65], 80)).toBe(true);
  });
});

describe("dimensionScores", () => {
  it("extracts and clamps clarity + conciseness + dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(85),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 150), dynDim("b", -5)],
    });
    expect(scores).toEqual([85, 70, 100, 0]);
  });

  it("returns just the two fixed scores when there are no dynamic criteria", () => {
    expect(
      dimensionScores({ clarity: dim(60), conciseness: dim(40), dynamicCriteria: [] })
    ).toEqual([60, 40]);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "Game",
    clarity: dim(90),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("core_mechanic", 75)],
    refinedPrompt: "Build a game",
  };

  it("clamps scores and computes overall deterministically", () => {
    const result = finalizeAssessment({
      ...baseRaw,
      clarity: dim(200),
      conciseness: dim(-10),
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(computeOverall([100, 0, 75]));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(baseRaw, 70);
    expect(result.threshold).toBe(70);
  });

  it("sets ready=true when all dimensions pass gate", () => {
    const raw = {
      ...baseRaw,
      clarity: dim(85),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("k", 80)],
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when overall is below threshold", () => {
    const raw = {
      ...baseRaw,
      clarity: dim(50),
      conciseness: dim(50),
      dynamicCriteria: [dynDim("k", 50)],
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const result = finalizeAssessment(baseRaw);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("clarity", 70),
    dynDim("scope", 80),
    dynDim("audience", 90),
    dynDim("extra", 60),
  ];

  it("caps to 3 items on first call (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe("clarity");
    expect(result[1].key).toBe("scope");
    expect(result[2].key).toBe("audience");
  });

  it("deduplicates by key, keeping first occurrence", () => {
    const duped: DynamicCriterion[] = [dynDim("a", 70), dynDim("a", 90), dynDim("b", 60)];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70);
  });

  it("handles undefined input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("locks to prior criteria when provided", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
      { key: "clarity", label: "Clarity", bestPractice: "be_clear_and_direct" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(80);
    expect(result[1].key).toBe("clarity");
    expect(result[1].score).toBe(70);
    // label and bestPractice come from prior, not from items
    expect(result[0].label).toBe("Scope");
    expect(result[0].bestPractice).toBe("set_constraints_and_scope");
  });

  it("falls back to positional match when prior key is absent", () => {
    const prior: CriterionSpec[] = [
      { key: "missing_key", label: "Missing", bestPractice: "be_clear_and_direct" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("missing_key");
    // Positional fallback: items[0] = clarity at 70
    expect(result[0].score).toBe(70);
  });

  it("clamps scores in prior-locked mode", () => {
    const overflowed: DynamicCriterion[] = [dynDim("scope", 999)];
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
    ];
    const result = normalizeDynamicCriteria(overflowed, prior);
    expect(result[0].score).toBe(100);
  });
});
