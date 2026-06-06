import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  dimensionScores,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DEFAULT_THRESHOLD,
  DIMENSION_FLOOR,
} from "../scoring";
import type { Assessment, DynamicCriterion, CriterionSpec } from "../types";

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
  it("clamps to [0, 100]", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
    expect(clamp(50)).toBe(50);
  });

  it("rounds to integer", () => {
    expect(clamp(72.7)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });

  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("bad" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds result", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 rounds to 81
  });
});

describe("isReady", () => {
  it("returns true when overall and all dimensions meet thresholds", () => {
    expect(isReady(80, [80, 70, 66], 80)).toBe(true);
  });

  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 70], 80)).toBe(false);
  });

  it("returns false when any dimension is below floor (65)", () => {
    expect(isReady(85, [90, 64, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isReady(70, [70, 70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70, 70], 75)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 90), dynDim("b", 60)],
    });
    expect(scores).toEqual([80, 70, 90, 60]);
  });

  it("clamps all scores", () => {
    const scores = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const rawBase: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "App",
    clarity: dim(80),
    conciseness: dim(80),
    dynamicCriteria: [dynDim("audience", 80)],
    refinedPrompt: "build a todo app",
  };

  it("computes overall as mean", () => {
    const a = finalizeAssessment(rawBase, 80);
    expect(a.overall).toBe(80);
  });

  it("sets ready true when all pass", () => {
    const a = finalizeAssessment(rawBase, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready false when one dimension below floor", () => {
    const a = finalizeAssessment(
      { ...rawBase, clarity: dim(60) },
      70,
    );
    expect(a.ready).toBe(false);
  });

  it("stamps the threshold", () => {
    const a = finalizeAssessment(rawBase, 75);
    expect(a.threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when not provided", () => {
    const a = finalizeAssessment(rawBase);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps out-of-range scores", () => {
    const a = finalizeAssessment({ ...rawBase, clarity: dim(150) }, 80);
    expect(a.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    dynDim("audience", 80),
    dynDim("scope", 70),
    dynDim("success", 60),
    dynDim("extra", 50), // 4th — should be dropped on first assessment
  ];

  it("caps to 3 on first assessment (no prior)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("deduplicates by key", () => {
    const dupes: DynamicCriterion[] = [dynDim("a", 80), dynDim("a", 90)];
    const result = normalizeDynamicCriteria(dupes, null);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80); // first one wins
  });

  it("locks to prior criteria order and keys", () => {
    const prior: CriterionSpec[] = [
      { key: "scope", label: "Scope", bestPractice: "bp" },
      { key: "audience", label: "Audience", bestPractice: "bp" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("scope");
    expect(result[0].score).toBe(70);
    expect(result[1].key).toBe("audience");
    expect(result[1].score).toBe(80);
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });

  it("filters items missing a key", () => {
    const mixed = [...items, { label: "no key", score: 50, rationale: "", suggestion: "", bestPractice: "" } as DynamicCriterion];
    const result = normalizeDynamicCriteria(mixed, null);
    expect(result.every((r) => r.key)).toBe(true);
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
