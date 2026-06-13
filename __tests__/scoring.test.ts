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
} from "../lib/scoring";
import type { Assessment, CriterionSpec, DynamicCriterion } from "../lib/types";

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
  it("clamps to 0–100 and rounds", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(75.6)).toBe(76);
  });
  it("returns 0 for NaN or non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean rounded to nearest integer", () => {
    expect(computeOverall([80, 70, 90])).toBe(80);
    expect(computeOverall([0, 100])).toBe(50);
    expect(computeOverall([33, 33, 34])).toBe(33);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores in order", () => {
    const result = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynDim("a", 90), dynDim("b", 60)],
    });
    expect(result).toEqual([80, 70, 90, 60]);
  });
  it("clamps individual scores", () => {
    const result = dimensionScores({
      clarity: dim(120),
      conciseness: dim(-5),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("isReady", () => {
  it("requires overall >= threshold AND all scores >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 70, 65], 80)).toBe(true);
    expect(isReady(79, [80, 70, 65], 80)).toBe(false);
    expect(isReady(80, [80, 70, 64], 80)).toBe(false);
  });
  it("returns false for empty scores", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
  it("uses custom threshold", () => {
    expect(isReady(70, [70, 70], 70)).toBe(true);
    expect(isReady(70, [70, 70], 71)).toBe(false);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web app",
    clarity: dim(85),
    conciseness: dim(75),
    dynamicCriteria: [dynDim("audience", 80)],
    refinedPrompt: "Build a task app",
  };

  it("computes overall as mean of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((85 + 75 + 80) / 3));
  });

  it("sets ready=true when above threshold and floor", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when below threshold", () => {
    const low = { ...base, clarity: dim(40), conciseness: dim(40), dynamicCriteria: [dynDim("a", 40)] };
    const result = finalizeAssessment(low, 80);
    expect(result.ready).toBe(false);
  });

  it("sets ready=false when any dimension below DIMENSION_FLOOR", () => {
    const borderline = {
      ...base,
      clarity: dim(80),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("a", DIMENSION_FLOOR - 1)],
    };
    const result = finalizeAssessment(borderline, 80);
    expect(result.ready).toBe(false);
  });

  it("stamps the threshold", () => {
    expect(finalizeAssessment(base, 75).threshold).toBe(75);
  });

  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    expect(finalizeAssessment(base).threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps out-of-range model scores", () => {
    const wild = { ...base, clarity: dim(150), conciseness: dim(-20) };
    const result = finalizeAssessment(wild, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const spec: CriterionSpec[] = [
    { key: "a", label: "A", bestPractice: "a" },
    { key: "b", label: "B", bestPractice: "b" },
  ];

  it("caps to 3 on first assessment (no prior)", () => {
    const items = [dynDim("x", 70), dynDim("y", 60), dynDim("z", 50), dynDim("w", 40)];
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("deduplicates by key on first assessment", () => {
    const items = [dynDim("x", 70), dynDim("x", 80), dynDim("y", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["x", "y"]);
    expect(result.find((d) => d.key === "x")?.score).toBe(70); // first wins
  });

  it("locks to prior specs when provided", () => {
    const items = [dynDim("b", 75), dynDim("a", 85), dynDim("c", 50)];
    const result = normalizeDynamicCriteria(items, spec);
    expect(result.map((d) => d.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(85);
    expect(result[1].score).toBe(75);
  });

  it("preserves prior label/bestPractice when locking", () => {
    const items = [{ ...dynDim("a", 85), label: "NEW", bestPractice: "overridden" }];
    const result = normalizeDynamicCriteria(items, spec);
    expect(result[0].label).toBe("A");
    expect(result[0].bestPractice).toBe("a");
  });

  it("returns empty array for undefined input", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
