import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "../lib/scoring";
import type { DynamicCriterion, CriterionSpec } from "../lib/types";

describe("clamp", () => {
  it("keeps in-range values unchanged", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });

  it("clamps below-zero to 0", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-9999)).toBe(0);
  });

  it("clamps above-100 to 100", () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(9999)).toBe(100);
  });

  it("rounds fractional values", () => {
    expect(clamp(50.4)).toBe(50);
    expect(clamp(50.5)).toBe(51);
  });

  it("returns 0 for NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("abc" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages a list of scores", () => {
    expect(computeOverall([80, 60])).toBe(70);
    expect(computeOverall([100, 100, 100])).toBe(100);
    expect(computeOverall([0])).toBe(0);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([80, 81])).toBe(81);
  });
});

describe("isReady", () => {
  it("returns true when overall >= threshold and all scores >= DIMENSION_FLOOR", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("returns false when overall < threshold", () => {
    expect(isReady(79, [90, 90, 90], 80)).toBe(false);
  });

  it("returns false when any score is below DIMENSION_FLOOR", () => {
    const floor = DIMENSION_FLOOR;
    expect(isReady(90, [90, 90, floor - 1], 80)).toBe(false);
  });

  it("returns false for an empty scores array", () => {
    expect(isReady(100, [], 80)).toBe(false);
  });
});

const makeDim = (score: number) => ({ score, rationale: "r", suggestion: "s" });

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: "be_clear_and_direct",
  score,
  rationale: "r",
  suggestion: "s",
});

describe("finalizeAssessment", () => {
  it("computes overall and ready from raw scores", () => {
    const result = finalizeAssessment({
      projectType: "Web app",
      clarity: makeDim(90),
      conciseness: makeDim(85),
      dynamicCriteria: [makeDynamic("define_audience", 80)],
      refinedPrompt: "A todo app",
    });
    expect(result.overall).toBe(85);
    expect(result.ready).toBe(true);
    expect(result.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps out-of-range scores before computing", () => {
    const result = finalizeAssessment({
      projectType: "Game",
      clarity: makeDim(150),
      conciseness: makeDim(-10),
      dynamicCriteria: [],
      refinedPrompt: "A game",
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(50);
  });

  it("marks ready=false when a dimension is below floor", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: makeDim(95),
        conciseness: makeDim(50),
        dynamicCriteria: [],
        refinedPrompt: "An app",
      },
      80,
    );
    expect(result.ready).toBe(false);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key on first call (no prior)", () => {
    const items = [makeDynamic("a", 80), makeDynamic("a", 90), makeDynamic("b", 70)];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(80); // first wins
    expect(result[1].key).toBe("b");
  });

  it("caps to 3 on first call", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 80));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior criteria when provided", () => {
    const prior: CriterionSpec[] = [
      { key: "a", label: "A", bestPractice: "be_clear_and_direct" },
      { key: "b", label: "B", bestPractice: "provide_context" },
    ];
    const items = [makeDynamic("a", 88), makeDynamic("b", 72)];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(88);
    expect(result[0].label).toBe("A");
    expect(result[1].key).toBe("b");
    expect(result[1].score).toBe(72);
  });

  it("defaults score to 0 if prior key missing from items", () => {
    const prior: CriterionSpec[] = [{ key: "missing", label: "X", bestPractice: "provide_context" }];
    const result = normalizeDynamicCriteria([], prior);
    expect(result[0].score).toBe(0);
  });

  it("handles undefined/null items gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toHaveLength(0);
  });
});
