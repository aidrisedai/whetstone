import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "./types";

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
  it("clamps to 0–100", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(75)).toBe(75);
  });

  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(74.6)).toBe(75);
    expect(clamp(74.4)).toBe(74);
  });
});

describe("computeOverall", () => {
  it("averages scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the average", () => {
    expect(computeOverall([80, 81])).toBe(81); // 80.5 rounds up
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("originality", 90)],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("clamps each score", () => {
    const scores = dimensionScores({
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(scores).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("passes when overall meets threshold and all dimensions clear floor", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
  });

  it("fails when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("fails when any dimension is below the floor", () => {
    expect(isReady(85, [85, 85, DIMENSION_FLOOR - 1], 80)).toBe(false);
  });

  it("fails on empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70], 75)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "App",
    clarity: dim(90),
    conciseness: dim(85),
    dynamicCriteria: [dynDim("originality", 80)],
    refinedPrompt: "Build a thing",
  };

  it("computes overall as the mean of all dimension scores", () => {
    const result = finalizeAssessment(base);
    expect(result.overall).toBe(Math.round((90 + 85 + 80) / 3));
  });

  it("sets ready=true when all conditions met", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when threshold not met", () => {
    const low = { ...base, clarity: dim(50), conciseness: dim(50), dynamicCriteria: [] };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold on the result", () => {
    const result = finalizeAssessment(base, 75);
    expect(result.threshold).toBe(75);
  });

  it("clamps out-of-range scores from the model", () => {
    const raw = { ...base, clarity: dim(150), conciseness: dim(-20) };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("dedupes by key on first pass (no prior)", () => {
    const items: DynamicCriterion[] = [dynDim("a", 80), dynDim("a", 90), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first wins
  });

  it("caps to 3 on first pass", () => {
    const items = ["a", "b", "c", "d"].map((k) => dynDim(k, 80));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order on subsequent passes", () => {
    const prior: CriterionSpec[] = [
      { key: "b", label: "B", bestPractice: "bp" },
      { key: "a", label: "A", bestPractice: "bp" },
    ];
    const items = [dynDim("a", 90), dynDim("b", 70)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(70);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(90);
  });

  it("uses prior label/bestPractice even if model echoes different values", () => {
    const prior: CriterionSpec[] = [{ key: "x", label: "Original Label", bestPractice: "orig bp" }];
    const items: DynamicCriterion[] = [
      { key: "x", label: "Drifted Label", bestPractice: "drifted bp", score: 75, rationale: "r", suggestion: "s" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Original Label");
    expect(result[0].bestPractice).toBe("orig bp");
    expect(result[0].score).toBe(75);
  });

  it("handles undefined/null items gracefully", () => {
    const result = normalizeDynamicCriteria(undefined, null);
    expect(result).toEqual([]);
  });
});
