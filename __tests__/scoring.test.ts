import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "@/lib/types";

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
  it("clamps above 100", () => expect(clamp(150)).toBe(100));
  it("clamps below 0", () => expect(clamp(-10)).toBe(0));
  it("rounds to integer", () => expect(clamp(72.7)).toBe(73));
  it("handles NaN", () => expect(clamp(NaN)).toBe(0));
  it("handles non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
  it("passes through valid value", () => expect(clamp(80)).toBe(80));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("computes mean and rounds", () => expect(computeOverall([70, 80, 90])).toBe(80));
  it("rounds correctly for non-integer means", () => expect(computeOverall([70, 71])).toBe(71));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores", () => {
    const scores = dimensionScores({
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("d1", 90)],
    });
    expect(scores).toEqual([70, 80, 90]);
  });

  it("clamps out-of-range scores", () => {
    const scores = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("returns false when a dimension is below the floor", () => {
    expect(isReady(85, [85, 85, 60], 80)).toBe(false);
  });

  it("returns true when overall meets threshold and all dimensions clear the floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });

  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });

  it("uses DIMENSION_FLOOR correctly", () => {
    // One dim exactly at the floor
    expect(isReady(90, [90, 90, DIMENSION_FLOOR], 80)).toBe(true);
    // One dim just below the floor
    expect(isReady(90, [90, 90, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const raw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Game",
    clarity: dim(75),
    conciseness: dim(85),
    dynamicCriteria: [dynDim("originality", 80)],
    refinedPrompt: "Build a game",
  };

  it("computes overall as mean of all dimensions", () => {
    const a = finalizeAssessment(raw, 80);
    expect(a.overall).toBe(Math.round((75 + 85 + 80) / 3));
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(raw, 75);
    expect(a.threshold).toBe(75);
  });

  it("sets ready true when all conditions met", () => {
    const highRaw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...raw,
      clarity: dim(85),
      conciseness: dim(90),
      dynamicCriteria: [dynDim("d", 90)],
    };
    const a = finalizeAssessment(highRaw, 80);
    expect(a.ready).toBe(true);
  });

  it("clamps out-of-range model scores", () => {
    const extremeRaw: Omit<Assessment, "overall" | "ready" | "threshold"> = {
      ...raw,
      clarity: dim(120),
      conciseness: dim(-10),
    };
    const a = finalizeAssessment(extremeRaw, 80);
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });

  it("uses DEFAULT_THRESHOLD when none provided", () => {
    const a = finalizeAssessment(raw);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("originality", 70),
    dynDim("scope", 80),
    dynDim("clarity", 90),
    dynDim("extra", 60),
  ];

  it("caps to 3 on the first call (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const duped: DynamicCriterion[] = [dynDim("a", 70), dynDim("a", 80), dynDim("b", 90)];
    const result = normalizeDynamicCriteria(duped, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("locks to prior spec order and merges latest scores", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "bp" },
      { key: "originality", label: "Originality", bestPractice: "bp" },
    ];
    const newItems: DynamicCriterion[] = [
      dynDim("originality", 95),
      dynDim("scope", 88),
    ];
    const result = normalizeDynamicCriteria(newItems, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(88);
    expect(result[1].key).toBe("originality");
    expect(result[1].score).toBe(95);
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
