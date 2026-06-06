import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "./scoring";
import type { DynamicCriterion, CriterionSpec } from "./types";

describe("clamp", () => {
  it("keeps values in 0-100", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-5)).toBe(0);
    expect(clamp(105)).toBe(100);
  });
  it("rounds to nearest integer", () => {
    expect(clamp(72.6)).toBe(73);
    expect(clamp(72.4)).toBe(72);
  });
  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("returns mean of scores", () => {
    expect(computeOverall([60, 80])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0])).toBe(0);
  });
  it("returns 0 for empty array", () => {
    expect(computeOverall([])).toBe(0);
  });
});

describe("isReady", () => {
  it("is ready when overall >= threshold and all dims above floor", () => {
    expect(isReady(80, [80, 80, 75], 80)).toBe(true);
    expect(isReady(85, [90, 70, 80], 80)).toBe(true);
  });
  it("is not ready when overall below threshold", () => {
    expect(isReady(79, [80, 80, 75], 80)).toBe(false);
  });
  it("is not ready when any dimension below DIMENSION_FLOOR", () => {
    const below = DIMENSION_FLOOR - 1;
    expect(isReady(80, [80, 80, below], 80)).toBe(false);
  });
  it("returns false for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const dynDim = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

describe("finalizeAssessment", () => {
  it("clamps scores and computes overall deterministically", () => {
    const raw = {
      projectType: "Web app",
      clarity: dim(110),
      conciseness: dim(-10),
      dynamicCriteria: [dynDim("audience", 75)],
      refinedPrompt: "Build something",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.dynamicCriteria[0].score).toBe(75);
    // mean(100, 0, 75) = 58
    expect(result.overall).toBe(58);
    expect(result.ready).toBe(false);
  });

  it("marks ready when all conditions met", () => {
    const raw = {
      projectType: "Web app",
      clarity: dim(85),
      conciseness: dim(80),
      dynamicCriteria: [dynDim("audience", 82)],
      refinedPrompt: "Build it",
    };
    const result = finalizeAssessment(raw, 80);
    expect(result.overall).toBe(82);
    expect(result.ready).toBe(true);
  });

  it("stamps the active threshold", () => {
    const raw = {
      projectType: "Game",
      clarity: dim(50),
      conciseness: dim(50),
      dynamicCriteria: [],
      refinedPrompt: "Build a game",
    };
    const result = finalizeAssessment(raw, 70);
    expect(result.threshold).toBe(70);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key and caps to 3 on first call", () => {
    const items: DynamicCriterion[] = [
      dynDim("a", 70),
      dynDim("a", 80), // duplicate — first wins
      dynDim("b", 60),
      dynDim("c", 75),
      dynDim("d", 90),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first occurrence wins
  });

  it("locks to prior criteria set in order", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "define_audience" },
      { key: "scope", label: "Scope", bestPractice: "set_constraints_and_scope" },
    ];
    const fresh: DynamicCriterion[] = [
      dynDim("audience", 80),
      dynDim("scope", 65),
    ];
    const result = normalizeDynamicCriteria(fresh, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[0].score).toBe(80);
    expect(result[0].label).toBe("Audience");
    expect(result[1].key).toBe("scope");
    expect(result[1].score).toBe(65);
  });

  it("handles empty or undefined input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });
});
