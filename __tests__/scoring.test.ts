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
import type { Assessment, DynamicCriterion } from "../lib/types";

const makeDim = (score: number) => ({
  score,
  rationale: "test",
  suggestion: "test",
});

const makeDynamic = (key: string, score: number): DynamicCriterion => ({
  key,
  label: key,
  bestPractice: key,
  score,
  rationale: "test",
  suggestion: "test",
});

describe("clamp", () => {
  it("clamps values to 0–100", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(101)).toBe(100);
    expect(clamp(50)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    expect(clamp(50.7)).toBe(51);
    expect(clamp(50.4)).toBe(50);
  });

  it("handles NaN and non-numbers", () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp("oops" as unknown as number)).toBe(0);
  });
});

describe("computeOverall", () => {
  it("averages an array of scores", () => {
    expect(computeOverall([80, 90])).toBe(85);
    expect(computeOverall([60, 70, 80])).toBe(70);
  });

  it("returns 0 for an empty array", () => {
    expect(computeOverall([])).toBe(0);
  });

  it("rounds the result", () => {
    expect(computeOverall([66, 67])).toBe(67); // 66.5 rounds to 67
  });
});

describe("isReady", () => {
  it("passes when overall >= threshold and all scores >= floor", () => {
    expect(isReady(80, [80, 70, 75], 80)).toBe(true);
  });

  it("fails when overall is below threshold", () => {
    expect(isReady(79, [80, 70, 75], 80)).toBe(false);
  });

  it("fails when any score is below the floor (65)", () => {
    // all individually above floor, overall above threshold but min is 64
    expect(isReady(80, [100, 100, 64], 80)).toBe(false);
  });

  it("fails for empty scores", () => {
    expect(isReady(80, [], 80)).toBe(false);
  });
});

describe("dimensionScores", () => {
  it("flattens clarity, conciseness, and dynamic scores into one array", () => {
    const result = dimensionScores({
      clarity: makeDim(85),
      conciseness: makeDim(75),
      dynamicCriteria: [makeDynamic("a", 70), makeDynamic("b", 60)],
    });
    expect(result).toEqual([85, 75, 70, 60]);
  });

  it("clamps all scores", () => {
    const result = dimensionScores({
      clarity: makeDim(110),
      conciseness: makeDim(-5),
      dynamicCriteria: [],
    });
    expect(result).toEqual([100, 0]);
  });
});

describe("finalizeAssessment", () => {
  const base: Omit<Assessment, "overall" | "ready" | "threshold"> = {
    projectType: "Web app",
    clarity: makeDim(85),
    conciseness: makeDim(80),
    dynamicCriteria: [makeDynamic("define_audience", 78)],
    refinedPrompt: "Build something.",
  };

  it("computes overall as the mean of all dimensions", () => {
    const a = finalizeAssessment(base, 80);
    // (85 + 80 + 78) / 3 = 243 / 3 = 81
    expect(a.overall).toBe(81);
  });

  it("sets ready=true when overall >= threshold and all scores >= floor", () => {
    const a = finalizeAssessment(base, 80);
    expect(a.ready).toBe(true);
  });

  it("sets ready=false when overall < threshold", () => {
    const a = finalizeAssessment(
      { ...base, clarity: makeDim(50), conciseness: makeDim(50), dynamicCriteria: [makeDynamic("d", 50)] },
      80,
    );
    expect(a.ready).toBe(false);
  });

  it("sets ready=false when a dimension is below the floor (65)", () => {
    const a = finalizeAssessment(
      {
        ...base,
        clarity: makeDim(100),
        conciseness: makeDim(100),
        dynamicCriteria: [makeDynamic("d", 60)], // below DIMENSION_FLOOR
      },
      80,
    );
    expect(a.ready).toBe(false);
  });

  it("stamps the active threshold", () => {
    const a = finalizeAssessment(base, 70);
    expect(a.threshold).toBe(70);
  });

  it("uses DEFAULT_THRESHOLD when none supplied", () => {
    const a = finalizeAssessment(base);
    expect(a.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it("clamps raw scores coming from the model", () => {
    const a = finalizeAssessment(
      { ...base, clarity: makeDim(150), conciseness: makeDim(-10), dynamicCriteria: [] },
      80,
    );
    expect(a.clarity.score).toBe(100);
    expect(a.conciseness.score).toBe(0);
  });
});

describe("normalizeDynamicCriteria", () => {
  const items: DynamicCriterion[] = [
    makeDynamic("clarity", 80),
    makeDynamic("scope", 70),
    makeDynamic("clarity", 90), // duplicate key — should be deduplicated
  ];

  it("deduplicates by key (first occurrence wins)", () => {
    const result = normalizeDynamicCriteria(items, null);
    expect(result.map((d) => d.key)).toEqual(["clarity", "scope"]);
    expect(result[0].score).toBe(80); // first occurrence
  });

  it("caps to 3 on the first assessment (no prior)", () => {
    const many = ["a", "b", "c", "d"].map((k) => makeDynamic(k, 70));
    const result = normalizeDynamicCriteria(many, null);
    expect(result).toHaveLength(3);
  });

  it("locks to prior criteria order when prior is given", () => {
    const prior = [
      { key: "scope", label: "Scope", bestPractice: "scope" },
      { key: "clarity", label: "Clarity", bestPractice: "clarity" },
    ];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result.map((d) => d.key)).toEqual(["scope", "clarity"]);
    expect(result[0].score).toBe(70);
    expect(result[1].score).toBe(80);
  });

  it("returns empty array for undefined input with no prior", () => {
    expect(normalizeDynamicCriteria(undefined, null)).toEqual([]);
  });

  it("preserves prior labels even if model returns different ones", () => {
    const prior = [{ key: "clarity", label: "Clarity (locked)", bestPractice: "clarity" }];
    const result = normalizeDynamicCriteria(items, prior);
    expect(result[0].label).toBe("Clarity (locked)");
  });
});

describe("constants", () => {
  it("DEFAULT_THRESHOLD is 80 with no env override", () => {
    expect(DEFAULT_THRESHOLD).toBe(80);
  });

  it("DIMENSION_FLOOR is 65", () => {
    expect(DIMENSION_FLOOR).toBe(65);
  });
});
