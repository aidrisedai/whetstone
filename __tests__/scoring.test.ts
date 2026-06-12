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
import type { DynamicCriterion } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("returns 0 for negative input", () => expect(clamp(-1)).toBe(0));
  it("returns 100 for input above 100", () => expect(clamp(101)).toBe(100));
  it("passes through values in range", () => expect(clamp(75)).toBe(75));
  it("rounds fractional values", () => expect(clamp(74.6)).toBe(75));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number type", () => expect(clamp("oops" as unknown as number)).toBe(0));
  it("handles boundary 0", () => expect(clamp(0)).toBe(0));
  it("handles boundary 100", () => expect(clamp(100)).toBe(100));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages two equal scores", () => expect(computeOverall([80, 80])).toBe(80));
  it("averages two different scores", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds to nearest integer", () => expect(computeOverall([0, 1])).toBe(1)); // 0.5 → rounds to 1
  it("handles a single score", () => expect(computeOverall([77])).toBe(77));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(80, [], 80)).toBe(false));
  it("returns false when overall below threshold", () => expect(isReady(79, [80, 80], 80)).toBe(false));
  it("returns true when overall meets threshold and all scores ≥ floor", () =>
    expect(isReady(80, [80, 80], 80)).toBe(true));
  it("returns false when any score is below DIMENSION_FLOOR", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR - 1], 80)).toBe(false));
  it("passes with score exactly at DIMENSION_FLOOR", () =>
    expect(isReady(80, [80, DIMENSION_FLOOR], 80)).toBe(true));
  it("uses custom threshold", () => expect(isReady(90, [90, 90], 95)).toBe(false));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("a", 90)],
    });
    expect(scores).toEqual([70, 80, 90]);
  });

  it("clamps individual scores", () => {
    const scores = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const baseRaw = {
    projectType: "App",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("originality", 80)],
    refinedPrompt: "Build a to-do app",
  };

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(baseRaw);
    // (85 + 75 + 80) / 3 = 80
    expect(a.overall).toBe(80);
  });

  it("sets ready=true when overall and all dimensions pass", () => {
    const a = finalizeAssessment(baseRaw, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall is too low", () => {
    const a = finalizeAssessment({ ...baseRaw, clarity: dim(50), conciseness: dim(50), dynamicCriteria: [dynDim("x", 50)] }, 80);
    expect(a.ready).toBe(false);
  });

  it("clamps scores out of range before computing", () => {
    const a = finalizeAssessment({ ...baseRaw, clarity: dim(150), conciseness: dim(-10), dynamicCriteria: [] });
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("stamps the active threshold", () => {
    const a = finalizeAssessment(baseRaw, 75);
    expect(a.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("scope", 70),
    dynDim("originality", 80),
    dynDim("feasibility", 90),
    dynDim("extra", 60), // 4th — should be trimmed on first pass
  ];

  it("caps to 3 on the first pass (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const duped = [dynDim("scope", 70), dynDim("scope", 85)];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(70); // first one wins
  });

  it("locks to prior keys when prior is provided", () => {
    const prior = [
      { key: "scope", label: "Scope", bestPractice: "bp1" },
      { key: "originality", label: "Originality", bestPractice: "bp2" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[1].key).toBe("originality");
  });

  it("uses prior's label and bestPractice, not the model's", () => {
    const prior = [{ key: "scope", label: "Locked Label", bestPractice: "Locked BP" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Locked Label");
    expect(result[0].bestPractice).toBe("Locked BP");
  });

  it("handles undefined items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
