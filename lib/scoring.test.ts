import { describe, it, expect } from "vitest";
import {
  clamp,
  computeOverall,
  isReady,
  finalizeAssessment,
  normalizeDynamicCriteria,
  DIMENSION_FLOOR,
  DEFAULT_THRESHOLD,
} from "./scoring";
import type { CriterionSpec, DynamicCriterion } from "./types";

describe("clamp", () => {
  it("clamps values below 0 to 0", () => expect(clamp(-10)).toBe(0));
  it("clamps values above 100 to 100", () => expect(clamp(150)).toBe(100));
  it("rounds to nearest integer", () => expect(clamp(72.6)).toBe(73));
  it("passes valid mid-range values through", () => expect(clamp(55)).toBe(55));
  it("returns 0 for NaN", () => expect(clamp(NaN)).toBe(0));
  it("returns 0 for non-number", () => expect(clamp("x" as unknown as number)).toBe(0));
});

describe("computeOverall", () => {
  it("returns the mean of all scores", () => expect(computeOverall([80, 60, 70])).toBe(70));
  it("rounds the mean", () => expect(computeOverall([80, 61])).toBe(71));
  it("handles a single score", () => expect(computeOverall([88])).toBe(88));
  it("returns 0 for an empty array", () => expect(computeOverall([])).toBe(0));
});

describe("isReady", () => {
  it("returns true when overall meets threshold and all scores clear the floor", () => {
    expect(isReady(82, [82, 75, 70], 80)).toBe(true);
  });
  it("returns false when overall is below threshold", () => {
    expect(isReady(79, [79, 75, 70], 80)).toBe(false);
  });
  it("returns false when any score is below DIMENSION_FLOOR", () => {
    expect(isReady(82, [82, 64, 90], 80)).toBe(false);
  });
  it("returns false for empty scores", () => {
    expect(isReady(85, [], 80)).toBe(false);
  });
  it("uses a custom threshold", () => {
    expect(isReady(70, [70, 68, 66], 65)).toBe(true);
  });
  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
  it("DEFAULT_THRESHOLD is 80", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });
});

const makeDim = (score: number) => ({
  score,
  rationale: "r",
  suggestion: "s",
});

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "r",
  suggestion: "s",
});

const specs: CriterionSpec[] = [
  { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
  { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
];

describe("finalizeAssessment", () => {
  it("computes overall as the mean of all clamped dimensions", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: makeDim(80),
      conciseness: makeDim(60),
      dynamicCriteria: [makeDynamic("define_audience", 70)],
      refinedPrompt: "Build something",
    });
    expect(result.overall).toBe(70); // (80 + 60 + 70) / 3
  });

  it("sets ready=true when all conditions met", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: makeDim(85),
        conciseness: makeDim(80),
        dynamicCriteria: [makeDynamic("k", 75)],
        refinedPrompt: "Build it",
      },
      80,
    );
    expect(result.ready).toBe(true);
  });

  it("sets ready=false when one dimension lags below DIMENSION_FLOOR", () => {
    const result = finalizeAssessment(
      {
        projectType: "App",
        clarity: makeDim(90),
        conciseness: makeDim(64), // below floor
        dynamicCriteria: [makeDynamic("k", 85)],
        refinedPrompt: "Build it",
      },
      80,
    );
    expect(result.ready).toBe(false);
  });

  it("clamps out-of-range model scores before computing overall", () => {
    const result = finalizeAssessment({
      projectType: "App",
      clarity: makeDim(120), // will be clamped to 100
      conciseness: makeDim(-5), // will be clamped to 0
      dynamicCriteria: [],
      refinedPrompt: "Build it",
    });
    expect(result.clarity.score).toBe(100);
    expect(result.conciseness.score).toBe(0);
    expect(result.overall).toBe(50);
  });

  it("stamps the active threshold", () => {
    const result = finalizeAssessment(
      { projectType: "App", clarity: makeDim(50), conciseness: makeDim(50), dynamicCriteria: [], refinedPrompt: "" },
      75,
    );
    expect(result.threshold).toBe(75);
  });
});

describe("normalizeDynamicCriteria", () => {
  it("deduplicates by key, keeping the first occurrence", () => {
    const items: DynamicCriterion[] = [
      makeDynamic("a", 70),
      makeDynamic("a", 80), // duplicate — dropped
      makeDynamic("b", 60),
    ];
    const result = normalizeDynamicCriteria(items, null);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("a");
    expect(result[0].score).toBe(70); // first wins
  });

  it("caps to 3 on the first assessment (no prior)", () => {
    const items = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 70));
    expect(normalizeDynamicCriteria(items, null)).toHaveLength(3);
  });

  it("locks to prior spec order when prior is provided", () => {
    const prior: CriterionSpec[] = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
      { key: "success_criteria", label: "Success", bestPractice: "success_criteria" },
    ];
    const items: DynamicCriterion[] = [
      makeDynamic("success_criteria", 75),
      makeDynamic("define_audience", 80),
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].key).toBe("define_audience");
    expect(result[0].score).toBe(80);
    expect(result[1].key).toBe("success_criteria");
    expect(result[1].score).toBe(75);
  });

  it("preserves prior keys/labels/bestPractice even if model changes them", () => {
    const prior: CriterionSpec[] = [
      { key: "define_audience", label: "Audience", bestPractice: "define_audience" },
    ];
    const items: DynamicCriterion[] = [
      { key: "define_audience", label: "CHANGED", bestPractice: "CHANGED", score: 70, rationale: "", suggestion: "" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Audience");
    expect(result[0].bestPractice).toBe("define_audience");
  });

  it("handles empty input gracefully", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
    expect(normalizeDynamicCriteria([], null)).toEqual([]);
  });

  it("falls back to positional match when prior key is missing from items", () => {
    const prior: CriterionSpec[] = [specs[0], specs[1]];
    const items: DynamicCriterion[] = [makeDynamic("define_audience", 72)];
    const result = normalizeDynamicCriteria(items, prior);
    // specs[1] (success_criteria) has no match by key, so it falls back to deduped[1] (undefined) → score 0
    expect(result).toHaveLength(2);
    expect(result[1].key).toBe("success_criteria"); // locked from prior spec
    expect(result[1].score).toBe(0); // no match found
  });
});
