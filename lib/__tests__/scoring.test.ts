import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

describe("clamp", () => {
  it("clamps to [0, 100]", () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(110)).toBe(100);
    expect(clamp(50)).toBe(50);
  });
  it("rounds to nearest integer", () => {
    expect(clamp(49.7)).toBe(50);
    expect(clamp(49.2)).toBe(49);
  });
  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("x" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of all scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([0, 100])).toBe(50);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
  it("rounds the result", () => {
    expect(computeOverall([70, 71])).toBe(71);
  });
});

describe("isReady", () => {
  it("is true when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [70, 80, 75], 80)).toBe(true);
  });
  it("is false when overall < threshold", () => {
    expect(isReady(79, [70, 80, 75], 80)).toBe(false);
  });
  it("is false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(80, [64, 90, 90], 80)).toBe(false);
  });
  it("is false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
  it("uses DIMENSION_FLOOR of 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
    expect(isReady(80, [65, 80, 80], 80)).toBe(true);
    expect(isReady(80, [64, 80, 80], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic scores", () => {
    const input = {
      clarity: dim(70),
      conciseness: dim(80),
      dynamicCriteria: [
        { ...dim(60), key: "k1", label: "L1", bestPractice: "bp1" } as DynamicCriterion,
      ],
    };
    expect(dimensionScores(input)).toEqual([70, 80, 60]);
  });
  it("clamps each score", () => {
    const input = {
      clarity: dim(110),
      conciseness: dim(-5),
      dynamicCriteria: [],
    };
    expect(dimensionScores(input)).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const makeCriteria = (score: number): DynamicCriterion[] => [
    { key: "k1", label: "L1", bestPractice: "bp1", ...dim(score) },
  ];

  it("computes overall and stamps threshold", () => {
    const raw = {
      projectType: "Web app",
      clarity: dim(80),
      conciseness: dim(80),
      dynamicCriteria: makeCriteria(80),
      refinedPrompt: "Build something.",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(80);
    expect(result.threshold).toBe(80);
    expect(result.ready).toBe(true);
  });

  it("marks not-ready when overall is below threshold", () => {
    const raw = {
      projectType: "Web app",
      clarity: dim(60),
      conciseness: dim(60),
      dynamicCriteria: makeCriteria(60),
      refinedPrompt: "Build something.",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range model scores", () => {
    const raw = {
      projectType: "Game",
      clarity: dim(150),
      conciseness: dim(-10),
      dynamicCriteria: makeCriteria(200),
      refinedPrompt: "Build a game.",
    };
    const result = finalizeAssessment(raw);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.dynamicCriteria[0].score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const spec = (key: string) => ({ key, label: key.toUpperCase(), bestPractice: key });
  const criterion = (key: string, score: number): DynamicCriterion => ({
    key,
    label: key.toUpperCase(),
    bestPractice: key,
    ...dim(score),
  });

  it("dedupes by key on first assessment (no prior)", () => {
    const items = [criterion("a", 70), criterion("a", 80), criterion("b", 60)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("caps to 3 on first assessment", () => {
    const items = ["a", "b", "c", "d"].map((k) => criterion(k, 70));
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior specs on subsequent assessments", () => {
    const prior = [spec("a"), spec("b")];
    const items = [criterion("a", 75), criterion("b", 90), criterion("c", 55)]; // 'c' is extra
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]); // prior keys preserved; 'c' dropped
    expect(result[0].score).toBe(75); // a matched by key
    expect(result[1].score).toBe(90); // b matched by key
  });

  it("uses positional fallback when a prior key is absent from model response", () => {
    const prior = [spec("a"), spec("b")];
    const items = [criterion("x", 55)]; // neither 'a' nor 'b' in model response
    const result = normalizeDynamicCriteria(items, prior);
    // 'a' (i=0) falls back to deduped[0] = criterion("x", 55)
    expect(result[0].score).toBe(55);
    // 'b' (i=1) has no match and no deduped[1] → score defaults to 0
    expect(result[1].score).toBe(0);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
