import { describe, expect, it } from "vitest";
import {
  clamp,
  computeOverall,
  DIMENSION_FLOOR,
  dimensionScores,
  finalizeAssessment,
  isReady,
  normalizeDynamicCriteria,
} from "@/lib/scoring";
import type { DynamicCriterion } from "@/lib/types";

const dim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const dynCrit = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "best",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("clamp", () => {
  it("clamps below 0 to 0", () => expect(clamp(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to integer", () => expect(clamp(72.6)).toBe(73));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("passes values in range through", () => expect(clamp(80)).toBe(80));
});

describe("computeOverall", () => {
  it("returns 0 for empty array", () => expect(computeOverall([])).toBe(0));
  it("returns single value unchanged", () => expect(computeOverall([75])).toBe(75));
  it("averages multiple scores", () => expect(computeOverall([80, 70, 90])).toBe(80));
  it("rounds averages", () => expect(computeOverall([80, 81])).toBe(81));
});

describe("dimensionScores", () => {
  it("includes clarity, conciseness, and dynamic criteria", () => {
    const scores = dimensionScores({
      clarity: dim(80),
      conciseness: dim(70),
      dynamicCriteria: [dynCrit("scope", 90)],
    });
    expect(scores).toEqual([80, 70, 90]);
  });

  it("works with no dynamic criteria", () => {
    const scores = dimensionScores({ clarity: dim(85), conciseness: dim(75), dynamicCriteria: [] });
    expect(scores).toEqual([85, 75]);
  });
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all dims above floor", () => {
    expect(isReady(85, [85, 80, 90], 80)).toBe(true);
  });

  it("returns false when overall below threshold", () => {
    expect(isReady(75, [85, 80, 90], 80)).toBe(false);
  });

  it("returns false when a dim is below the floor", () => {
    expect(isReady(85, [85, DIMENSION_FLOOR - 1, 90], 80)).toBe(false);
  });

  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });

  it("accepts score exactly at floor", () => {
    expect(isReady(80, [80, DIMENSION_FLOOR, 80], 80)).toBe(true);
  });
});

describe("finalizeAssessment", () => {
  const base = {
    projectType: "game" as const,
    clarity: dim(78),
    conciseness: dim(82),
    dynamicCriteria: [dynCrit("scope", 76)],
    refinedPrompt: "Build a quiz game",
  };

  it("computes overall as average of all dimensions", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.overall).toBe(Math.round((78 + 82 + 76) / 3));
  });

  it("stamps the threshold", () => {
    const result = finalizeAssessment(base, 80);
    expect(result.threshold).toBe(80);
  });

  it("sets ready=false when below threshold", () => {
    const result = finalizeAssessment(base, 90);
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range scores", () => {
    const result = finalizeAssessment({ ...base, clarity: dim(130) }, 80);
    expect(result.clarity.score).toBe(100);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items = [dynCrit("scope", 70), dynCrit("audience", 80)];

  it("deduplicates by key", () => {
    const duped = [...items, dynCrit("scope", 90)];
    const result = normalizeDynamicCriteria(duped, null);
    const keys = result.map((r) => r.key);
    expect(keys.filter((k) => k === "scope").length).toBe(1);
  });

  it("caps at 3 items when no prior", () => {
    const many = [dynCrit("a", 70), dynCrit("b", 80), dynCrit("c", 75), dynCrit("d", 60)];
    const result = normalizeDynamicCriteria(many, null);
    expect(result.length).toBe(3);
  });

  it("locks to prior order and keys", () => {
    const prior = [
      { key: "audience", label: "Audience", bestPractice: "bp" },
      { key: "scope", label: "Scope", bestPractice: "bp" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((r) => r.key)).toEqual(["audience", "scope"]);
    expect(result[0].score).toBe(80);
    expect(result[1].score).toBe(70);
  });

  it("handles undefined items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });
});
