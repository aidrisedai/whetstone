import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../scoring";
import type { Assessment, DynamicCriterion } from "../types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

describe("clamp", () => {
  it("clamps scores into [0, 100]", () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
  });

  it("rounds to integer", () => {
    expect(clamp(72.7)).toBe(73);
    expect(clamp(72.3)).toBe(72);
  });

  it("returns 0 for non-numeric inputs", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp(undefined as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("averages scores correctly", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([75, 85, 65])).toBe(75);
  });

  it("rounds the mean", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });
});

describe("isReady", () => {
  it("passes when overall >= threshold and every score >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 80, 80], 80)).toBe(true);
    expect(isReady(85, [70, 90, 80], 80)).toBe(true);
  });

  it("fails when overall is below threshold", () => {
    expect(isReady(79, [80, 80, 80], 80)).toBe(false);
  });

  it("fails when any score is below DIMENSION_FLOOR", () => {
    const below = DIMENSION_FLOOR - 1;
    expect(isReady(80, [80, below, 80], 80)).toBe(false);
  });

  it("fails for empty scores array", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("collects clarity, conciseness, and dynamic scores", () => {
    const dyn: DynamicCriterion = { ...dim(70), key: "k", label: "L", bestPractice: "bp" };
    const result = dimensionScores({
      clarity: dim(80),
      conciseness: dim(60),
      dynamicCriteria: [dyn],
    });
    expect(result).toEqual([80, 60, 70]);
  });

  it("clamps each score", () => {
    const dyn: DynamicCriterion = { ...dim(120), key: "k", label: "L", bestPractice: "bp" };
    const [, , d] = dimensionScores({
      clarity: dim(50),
      conciseness: dim(50),
      dynamicCriteria: [dyn],
    });
    expect(d).toBe(100);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "App",
    clarity: dim(80),
    conciseness: dim(80),
    dynamicCriteria: [
      { ...dim(80), key: "a", label: "A", bestPractice: "bp" },
    ],
    refinedPrompt: "build something cool",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(80);
  });

  it("sets ready=true when all scores clear floor and threshold", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when score is below threshold", () => {
    const low = { ...base, clarity: dim(50) };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("sets ready=false when one dimension is below floor", () => {
    const low = { ...base, dynamicCriteria: [{ ...dim(DIMENSION_FLOOR - 1), key: "x", label: "X", bestPractice: "bp" }] };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold onto the result", () => {
    expect(finalizeAssessment(base, 75).threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  const makeItem = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key.toUpperCase(),
    bestPractice: `bp-${key}`,
    score,
    rationale: "r",
    suggestion: "s",
  });

  it("dedupes by key on first run (no prior)", () => {
    const items = [makeItem("a", 70), makeItem("a", 80), makeItem("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((x) => x.key)).toEqual(["a", "b"]);
  });

  it("caps to 3 items on first run", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeItem(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order on subsequent runs", () => {
    const prior = [
      { key: "b", label: "B", bestPractice: "bp-b" },
      { key: "a", label: "A", bestPractice: "bp-a" },
    ];
    const items = [makeItem("a", 75), makeItem("b", 85)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("b");
    expect(result[0].score).toBe(85);
    expect(result[1].key).toBe("a");
    expect(result[1].score).toBe(75);
  });

  it("handles undefined/null input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria(null as unknown as DynamicCriterion[], null)).toEqual([]);
  });
});
