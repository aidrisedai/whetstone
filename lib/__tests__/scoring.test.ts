import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
} from "../scoring";
import type { DynamicCriterion, CriterionSpec } from "../types";

describe("clamp", () => {
  it("clamps low values to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps high values to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("abc" as unknown as number)).toBe(0));
  it("passes through valid range", () => expect(clamp(55)).toBe(55));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("averages a simple set", () => expect(computeOverall([60, 80])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([33, 33, 34])).toBe(33));
  it("handles single score", () => expect(computeOverall([75])).toBe(75));
});

describe("isReady", () => {
  it("returns false for empty scores", () => expect(isReady(90, [], 80)).toBe(false));
  it("returns true when overall meets threshold and all scores above floor", () =>
    expect(isReady(85, [85, 85, 85], 80)).toBe(true));
  it("returns false when overall below threshold", () =>
    expect(isReady(75, [75, 75, 75], 80)).toBe(false));
  it("returns false when one score is below floor", () =>
    expect(isReady(85, [85, 85, DIMENSION_FLOOR - 1], 80)).toBe(false));
  it("accepts score exactly at floor", () =>
    expect(isReady(85, [85, 85, DIMENSION_FLOOR], 80)).toBe(true));
  it("accepts overall exactly at threshold", () =>
    expect(isReady(80, [80, 80, 80], 80)).toBe(true));
});

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });
const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "bp",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("finalizeAssessment", () => {
  it("clamps scores and computes overall + ready flag", () => {
    const result = finalizeAssessment({
      projectType: "Web/SaaS",
      clarity: makeDim(90),
      conciseness: makeDim(85),
      dynamicCriteria: [makeDynamic("audience", 80)],
      refinedPrompt: "A cool app",
    });
    expect(result.overall).toBe(85);
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(result.threshold); // stamped
  });

  it("marks not-ready when overall is below threshold", () => {
    const result = finalizeAssessment(
      {
        projectType: "Game",
        clarity: makeDim(60),
        conciseness: makeDim(60),
        dynamicCriteria: [makeDynamic("mechanic", 60)],
        refinedPrompt: "A game",
      },
      80,
    );
    expect(result.ready).toBe(false);
    expect(result.overall).toBe(60);
  });

  it("marks not-ready when one dimension is below floor even if overall is high", () => {
    const result = finalizeAssessment(
      {
        projectType: "AI assistant",
        clarity: makeDim(100),
        conciseness: makeDim(100),
        dynamicCriteria: [makeDynamic("persona", 10)],
        refinedPrompt: "A bot",
      },
      80,
    );
    expect(result.ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("returns empty list for undefined input with no prior", () =>
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]));

  it("dedupes by key", () => {
    const items: DynamicCriterion[] = [makeDynamic("a", 70), makeDynamic("a", 80)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first-seen wins
  });

  it("caps to 3 when no prior", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 70));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior criteria keys/labels/bestPractice, pulls latest score", () => {
    const prior: CriterionSpec[] = [
      { key: "audience", label: "Audience", bestPractice: "bp1" },
      { key: "scope", label: "Scope", bestPractice: "bp2" },
    ];
    const items: DynamicCriterion[] = [
      { ...makeDynamic("audience", 88), label: "Ignored", bestPractice: "ignored" },
      { ...makeDynamic("scope", 72), label: "Ignored", bestPractice: "ignored" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("audience");
    expect(result[0].label).toBe("Audience"); // locked from prior
    expect(result[0].bestPractice).toBe("bp1");
    expect(result[0].score).toBe(88);
    expect(result[1].score).toBe(72);
  });
});
